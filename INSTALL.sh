#!/bin/bash
# Depurar el script
# set -x

# Verificar si el script se está ejecutando como root
if [ "$EUID" -ne 0 ]; then
    echo "Error: Este script debe ejecutarse como root."
    exit 1
fi

# Verificar si hay al menos 3GB de memoria RAM libre
FREE_MEM=$(free -m | awk '/^Mem:/ {print $7}')
MIN_MEM=3000 # 3GB em MB

if [ "$FREE_MEM" -lt "$MIN_MEM" ]; then
    echo "Error: Se necesitan al menos 3GB de memoria RAM libre para continuar."
    echo "Memoria libre actual: ${FREE_MEM}MB"
    echo "Liberá más memoria y probá de nuevo."
    exit 1
fi

echo "Verificación de memoria: OK (${FREE_MEM}MB libres)"

COLOR="\e[38;5;40m"
GREEN="\e[32m"
YELLOW="\e[33m"
RED="\e[31m"
RESET="\e[0m"
BOLD="\e[1m"

# Obtener la versión automáticamente
VERSION=$(git ls-remote --tags https://github.com/Re1M0n/proit-press.git | awk -F/ '{print $NF}' | sort -V | tail -n1 || echo "unknown")

# Registro del inicio de la ejecución
START_TIME=$(date +%s)

# Mostrar el uso correcto del comando
show_usage() {
    echo -e "\n\033[1;33m=== USO DEL SCRIPT ===\033[0m"
    echo -e "\033[1mComando:\033[0m"
    echo -e "  \033[1;32mcurl -sSL https://raw.githubusercontent.com/Re1M0n/proit-press/main/INSTALL.sh | sudo bash -s <SENHA_DEPLOY> <NOME_EMPRESA> <URL_BACKEND> <URL_FRONTEND> <PORT_BACKEND> <PORT_FRONTEND> <DB_PASS> <USER_LIMIT> <CONNECTION_LIMIT> <EMAIL>\033[0m"
    echo -e "\n\033[1mEjemplo:\033[0m"
    echo -e "  \033[1;32mcurl -sSL https://raw.githubusercontent.com/Re1M0n/proit-press/main/INSTALL.sh | sudo bash -s "senha123" "empresa" "back.pressticket.com.br" "front.pressticket.com.br" 4000 3000 "senha123" 3 10 "email@pressticket.com.br"\033[0m"
    echo -e "\n\033[1;33m======================\033[0m"
    exit 1
}

# Función para validar una URL
validate_url() {
    local url=$1
    url=$(echo "$url" | sed -E 's|^https?://||')
    if [[ ! "$url" =~ ^[a-zA-Z0-9.-]+$ ]]; then
        echo "Error: URL inválida - $url"
        return 1
    fi
    if ! host "$url" &>/dev/null; then
        echo -e "\e[31mError: El dominio $url no tiene DNS propagado.\e[0m"
        return 1
    fi
    echo "$url"
    return 0
}

# Validar parámetros
if [ $# -lt 10 ] || [ $# -gt 11 ]; then
    echo "Error: Cantidad incorrecta de argumentos proporcionada."
    usage
fi

SENHA_DEPLOY=$1
NOME_EMPRESA=$(echo "$2" | tr '[:upper:]' '[:lower:]' | tr -d ' ')
URL_BACKEND=$(validate_url "$3") || exit 1
URL_FRONTEND=$(validate_url "$4") || exit 1
PORT_BACKEND=$5
PORT_FRONTEND=$6
DB_PASS=$7
USER_LIMIT=$8
CONNECTION_LIMIT=$9
EMAIL=${10}
BRANCH=${11:-main}

# Validar campos obligatorios
errors=()

[[ -z "$SENHA_DEPLOY" ]] && errors+=("SENHA_DEPLOY es obligatorio.")
[[ -z "$NOME_EMPRESA" ]] && errors+=("NOME_EMPRESA es obligatorio.")
[[ ! "$PORT_BACKEND" =~ ^[0-9]+$ ]] && errors+=("PORT_BACKEND debe ser numérico.")
[[ ! "$PORT_FRONTEND" =~ ^[0-9]+$ ]] && errors+=("PORT_FRONTEND debe ser numérico.")
[[ -z "$DB_PASS" ]] && errors+=("DB_PASS es obligatorio.")
[[ ! "$USER_LIMIT" =~ ^[0-9]+$ ]] && errors+=("USER_LIMIT debe ser numérico.")
[[ ! "$CONNECTION_LIMIT" =~ ^[0-9]+$ ]] && errors+=("CONNECTION_LIMIT debe ser numérico.")
[[ ! "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]] && errors+=("EMAIL inválido.")

# Función para finalizar el script mostrando el tiempo total
finalizar() {
    local END_TIME=$(date +%s)
    local ELAPSED_TIME=$((END_TIME - START_TIME))
    local MINUTES=$((ELAPSED_TIME / 60))
    local SECONDS=$((ELAPSED_TIME % 60))

    local RED="\e[31m"
    local GREEN="\e[32m"
    local RESET="\e[0m"
    local BOLD="\e[1m"

    if [ "$2" -ne 0 ]; then
        # Mostrar mensaje de error si el código de salida es distinto de 0
        echo -e "${RED}Erro:${RESET} $1" | tee -a "$LOG_FILE"
    else
        # Mostrar mensaje de éxito
        echo -e "${GREEN}$1${RESET}" | tee -a "$LOG_FILE"
    fi

    # Resumen Final con Tiempo Formateado
    {
        echo " "
        echo "**************************************************************"
        echo "*                 PRESS TICKET® - INSTALACIÓN                *"
        echo "**************************************************************"
        echo " Versión Instalada: $VERSION                           "
        echo " Zona Horaria: $SELECTED_TZ                                 "
        echo " Fin de la Instalación: $(TZ=$SELECTED_TZ date +"%d-%m-%Y %H:%M:%S")   "
        echo " Ubicación del log: $LOG_FILE                                    "
        echo " Tiempo Total: ${MINUTES} minutos y ${SECONDS} segundos.       "
        echo "**************************************************************"
        echo " "
    } | tee -a "$LOG_FILE"

    exit "${2:-1}"
}

# Función para comparar versiones semánticas
version_compare() {
    local ver1=$1
    local ver2=$2
    
    # Elimina la 'v' del inicio si existe
    ver1=${ver1#v}
    ver2=${ver2#v}
    
    # Divide las versiones en array
    IFS='.' read -ra V1 <<< "$ver1"
    IFS='.' read -ra V2 <<< "$ver2"
    
    # Compara cada parte
    for i in 0 1 2; do
        local num1=${V1[$i]:-0}
        local num2=${V2[$i]:-0}
        
        if [ "$num1" -lt "$num2" ]; then
            return 1  # ver1 < ver2
        elif [ "$num1" -gt "$num2" ]; then
            return 2  # ver1 > ver2
        fi
    done
    
    return 0  # ver1 == ver2
}

# Define el directorio base absoluto
SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)

# Define los directorios de logs usando rutas absolutas
LOG_DIR="$SCRIPT_DIR/log"
CURRENT_LOG_DIR="$LOG_DIR/atual"
ARCHIVED_LOG_DIR="$LOG_DIR/arquivos"

# Crea los directorios de log
if ! mkdir -p "$CURRENT_LOG_DIR" "$ARCHIVED_LOG_DIR"; then
    echo "Error: No se pudieron crear los directorios de log. Verificá los permisos."
    finalizar "Error: No se pudieron crear los directorios de log. Verificá los permisos." 1
fi

# Compresión de logs antiguos usando zip
if find "$CURRENT_LOG_DIR" -type f -mtime +30 | grep -q .; then
    zip -j "$ARCHIVED_LOG_DIR/logs_$(date +'%Y-%m-%d').zip" "$CURRENT_LOG_DIR"/* -x "*.zip"
    if [ $? -eq 0 ]; then
        echo " "
        echo "Logs antiguos comprimidos con éxito en $ARCHIVED_LOG_DIR/logs_$(date +'%Y-%m-%d').zip"
        echo " "
        # Elimina los archivos comprimidos después del éxito
        find "$CURRENT_LOG_DIR" -type f -mtime +30 -exec rm {} \;
    else
        echo " "
        echo "Error al comprimir los logs antiguos."
        echo " "
    fi
else
    echo " "
    echo "No se encontraron logs antiguos para comprimir."
    echo " "
fi

# Captura la zona horaria pasada como argumento o usa America/Argentina/Buenos_Aires como predeterminada
SELECTED_TZ=${12:-America/Argentina/Buenos_Aires}

# Configuración del archivo de log (ajustada para usar la zona horaria)
LOG_FILE="$CURRENT_LOG_DIR/install_${NOME_EMPRESA}_$(TZ=$SELECTED_TZ date +"%d-%m-%Y_%H-%M-%S").log"

# Verifica si el archivo de log puede crearse
if ! touch "$LOG_FILE"; then
    echo " "
    echo "Error: No se pudo crear el archivo de log $LOG_FILE. Verificá los permisos."
    echo " "
    finalizar "Error: No se pudo crear el archivo de log $LOG_FILE. Verificá los permisos." 1
fi

{
    if [ ${#errors[@]} -gt 0 ]; then
        echo " "
        echo "\nSe encontraron los siguientes errores:"
        echo " "
        for error in "${errors[@]}"; do
            echo "- $error"
        done
        show_usage
    fi
} | tee -a "$LOG_FILE"

# Función para verificar e instalar un paquete
verificar_e_instalar() {
    local pacote="$1"
    echo " "
    echo -e "${COLOR}Verificando si $pacote está instalado...${RESET}" | tee -a "$LOG_FILE"
    echo " "
    if ! dpkg -s "$pacote" &>/dev/null; then # Verifica si el paquete está instalado
        echo -e "${COLOR}$pacote no encontrado. Intentando instalar...${RESET}" | tee -a "$LOG_FILE"
        sudo apt-get update &>/dev/null | tee -a "$LOG_FILE" # Redirige la salida del update al log también
        sudo apt-get install -y "$pacote" &>/dev/null | tee -a "$LOG_FILE"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}$pacote instalado con éxito.${RESET}" | tee -a "$LOG_FILE"
        else
            echo -e "${RED}Error al instalar $pacote. Verificá tu conexión y los repositorios.${RESET}" | tee -a "$LOG_FILE"
            finalizar "Error al instalar $pacote." 1 # Usando la función finalizar
        fi
    else
        echo -e "${GREEN}$pacote ya está instalado.${RESET}" | tee -a "$LOG_FILE"
    fi
}

# ============================================================================
# Sección 1: Verificación de dependencias
# ============================================================================
echo -e "${COLOR}Verificando las dependencias necesarias para la instalación...${RESET}" | tee -a "$LOG_FILE"

# Comandos esenciales (se instalan automáticamente si faltan)
check_cmd() {
    local cmd="$1"
    local pkg="${2:-$1}"
    if command -v "$cmd" &>/dev/null; then
        echo -e "${GREEN}✓ $cmd disponible: $(command -v $cmd)${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${YELLOW}✗ $cmd no encontrado. Se instalará $pkg.${RESET}" | tee -a "$LOG_FILE"
        verificar_e_instalar "$pkg"
    fi
}

check_cmd curl
check_cmd wget
check_cmd git
check_cmd openssl
check_cmd unzip

# Node.js y NPM (se requiere Node >= 22)
if command -v node &>/dev/null; then
    NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
    if [ "$NODE_MAJOR" -lt 22 ]; then
        echo -e "${YELLOW}✗ Node.js actual ($(node -v)) es < 22. Se actualizará a Node.js 22.x.${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${GREEN}✓ Node.js $(node -v) (requerido: >= 22)${RESET}" | tee -a "$LOG_FILE"
    fi
else
    echo -e "${YELLOW}✗ Node.js no encontrado. Se instalará Node.js 22.x.${RESET}" | tee -a "$LOG_FILE"
fi

if command -v npm &>/dev/null; then
    echo -e "${GREEN}✓ NPM $(npm -v)${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${YELLOW}✗ NPM no encontrado. Se instalará junto con Node.js.${RESET}" | tee -a "$LOG_FILE"
fi

# Base de datos MySQL/MariaDB
if dpkg -l | grep -q mysql-server; then
    echo -e "${GREEN}✓ MySQL detectado${RESET}" | tee -a "$LOG_FILE"
    DB_ENGINE="MySQL"
    DB_SERVICE="mysql"
elif dpkg -l | grep -q mariadb-server; then
    echo -e "${GREEN}✓ MariaDB detectado${RESET}" | tee -a "$LOG_FILE"
    DB_ENGINE="MariaDB"
    DB_SERVICE="mariadb"
else
    echo -e "${YELLOW}✗ No se detectó MySQL/MariaDB. Se instalará MariaDB en la Sección 2.${RESET}" | tee -a "$LOG_FILE"
fi

# PM2
if command -v pm2 &>/dev/null; then
    echo -e "${GREEN}✓ PM2 detectado${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${YELLOW}✗ PM2 no encontrado. Se instalará en el paso correspondiente.${RESET}" | tee -a "$LOG_FILE"
fi

# Verifica e instala el iproute2 (que contiene el ss)
verificar_e_instalar iproute2

# Verificar si los puertos ya están en uso (usando ss)
echo " "
echo -e "${COLOR}Verificando puertos ${PORT_BACKEND} y ${PORT_FRONTEND}...${RESET}" | tee -a "$LOG_FILE"
echo " "

if ss -tuln | grep -q ":$PORT_BACKEND\b"; then
    echo " "
    echo -e "${RED}Error: El puerto $PORT_BACKEND ya está en uso.${RESET}"
    echo " "
    finalizar "${RED}Error: El puerto $PORT_BACKEND ya está en uso.${RESET}" 1
fi

if ss -tuln | grep -q ":$PORT_FRONTEND\b"; then
    echo " "
    echo -e "${RED}Error: El puerto $PORT_FRONTEND ya está en uso.${RESET}"
    echo " "
    finalizar "${RED}Error: El puerto $PORT_FRONTEND ya está en uso.${RESET}" 1
fi

echo " "
echo -e "${GREEN}Puertos ${PORT_BACKEND} y ${PORT_FRONTEND} disponibles.${RESET}" | tee -a "$LOG_FILE"
echo " "

# Mostrar las variables validadas
{
    echo -e " "
    cat <<EOM
    *** Parámetros recibidos y validados con éxito: ***
    * SENHA_DEPLOY: ¡NO OLVIDAR!
    * NOME_EMPRESA: $NOME_EMPRESA
    * URL_BACKEND: $URL_BACKEND
    * URL_FRONTEND: $URL_FRONTEND
    * PORT_BACKEND: $PORT_BACKEND
    * PORT_FRONTEND: $PORT_FRONTEND
    * DB_PASS: ¡NO OLVIDAR!
    * USER_LIMIT: $USER_LIMIT
    * CONNECTION_LIMIT: $CONNECTION_LIMIT
    * EMAIL: $EMAIL
    * BRANCH: $BRANCH
    *****************************************************
EOM
    echo -e " "
} | tee -a "$LOG_FILE"

sleep 5

# Mostrar mensaje de inicio de la instalación
echo -e " "
echo -ne "${COLOR}Iniciando la instalación en ${YELLOW}10${RESET}..." | tee -a "$LOG_FILE"

# Cuenta regresiva de 10 a 0
for i in {9..0}; do
    echo -ne "\r${COLOR}Iniciando la instalación en ${YELLOW}$i${RESET}... " | tee -a "$LOG_FILE"
    sleep 1
done

echo -e " "

sleep 2

clear

echo -e " "
echo -e "${COLOR}██████╗ ██████╗ ███████╗███████╗███████╗    ████████╗██╗ ██████╗██╗  ██╗███████╗████████╗${RESET}"
echo -e "${COLOR}██╔══██╗██╔══██╗██╔════╝██╔════╝██╔════╝    ╚══██╔══╝██║██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝${RESET}"
echo -e "${COLOR}██████╔╝██████╔╝█████╗  ███████╗███████╗       ██║   ██║██║     █████╔╝ █████╗     ██║   ${RESET}"
echo -e "${COLOR}██╔═══╝ ██╔══██╗██╔══╝  ╚════██║╚════██║       ██║   ██║██║     ██╔═██╗ ██╔══╝     ██║   ${RESET}"
echo -e "${COLOR}██║     ██║  ██║███████╗███████║███████║       ██║   ██║╚██████╗██║  ██╗███████╗   ██║   ${RESET}"
echo -e "${COLOR}╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝       ╚═╝   ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝   ${RESET}"
echo -e "${GREEN}INSTALANDO LA VERSIÓN:${RESET} ${BOLD}$VERSION${RESET}"
echo -e " "

sleep 3

# Mostrar mensaje con la lista de zonas horarias
echo "La zona horaria predeterminada está definida como 'America/Argentina/Buenos_Aires'."

# Pausa para que el usuario lea el mensaje
sleep 3

# sleep 5

# sudo rm -f /var/lib/dpkg/updates/* | tee -a "$LOG_FILE"
# sudo dpkg --configure -a | tee -a "$LOG_FILE"

# Agregar información inicial al log
{
    echo " "
    echo "**************************************************************"
    echo "*               PRESS TICKET® - LOG DE INSTALACIÓN           *"
    echo "**************************************************************"
    echo " Versión a instalar: $VERSION                           "
    echo " Zona Horaria: $SELECTED_TZ                                 "
    echo " Inicio de la Instalación: $(TZ=$SELECTED_TZ date +"%d-%m-%Y %H:%M:%S")   "
    echo " Ubicación del log: $LOG_FILE                                    "
    echo "**************************************************************"
    echo " "
} | tee -a "$LOG_FILE"

echo " "
echo "Archivo de log creado con éxito: $LOG_FILE"
echo " "
# Mostrar la hora ajustada y guardarla en el log
echo "Zona horaria ajustada a: $SELECTED_TZ" | tee -a "$LOG_FILE"
echo "Hora ajustada para el log: $(TZ=$SELECTED_TZ date)" | tee -a "$LOG_FILE"

sleep 2

echo -e "${COLOR}Preparación Inicial...${RESET}" | tee -a "$LOG_FILE"
{
    cd ~
    echo "Actualizando paquetes del sistema sin intervención..."
    sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
    echo 'exit 0' | sudo tee /usr/sbin/policy-rc.d
    sudo sed -i 's/#\$nrconf{restart} =.*/$nrconf{restart} = "a";/' /etc/needrestart/needrestart.conf
    sudo DEBIAN_FRONTEND=noninteractive apt-get upgrade -y \
        -o Dpkg::Options::="--force-confdef" \
        -o Dpkg::Options::="--force-confold" \
        --allow-downgrades \
        --allow-remove-essential \
        --allow-change-held-packages \
        --no-install-recommends \
        --quiet
    sudo DEBIAN_FRONTEND=noninteractive apt-get install build-essential -y
    # sudo DEBIAN_FRONTEND=noninteractive apt-get install -y apparmor-utils
    echo -e "${GREEN}Actualización de paquetes completada con éxito.${RESET}" | tee -a "$LOG_FILE"

} | tee -a "$LOG_FILE"

# Sección 2: Verificación de MySQL e Instalación de MariaDB
echo -e "${COLOR}Verificando si MySQL ya está instalado...${RESET}" | tee -a "$LOG_FILE"

# Verificar si MySQL está instalado
if dpkg -l | grep -q mysql-server; then
    echo -e "${YELLOW}MySQL detectado en el sistema.${RESET}" | tee -a "$LOG_FILE"
    echo -e "${GREEN}Usando el MySQL existente en lugar de instalar MariaDB.${RESET}" | tee -a "$LOG_FILE"
    DB_ENGINE="MySQL"
    DB_SERVICE="mysql"
    
    # Configurar comando de MySQL
    if sudo mysql -u root -e "SELECT 1;" &>/dev/null; then
        MYSQL_CMD="sudo mysql -u root"
        echo -e "${GREEN}Conexión con MySQL realizada sin contraseña.${RESET}" | tee -a "$LOG_FILE"
    else
        MYSQL_CMD="sudo MYSQL_PWD=$DB_PASS mysql -u root"
        echo -e "${YELLOW}MySQL exige contraseña para conectarse. Usando la contraseña provista.${RESET}" | tee -a "$LOG_FILE"
    fi
    
    # Verificar la versión de MySQL
    echo -e "${COLOR}Verificando la versión de MySQL...${RESET}" | tee -a "$LOG_FILE"
    mysql --version | tee -a "$LOG_FILE"
    
    # Verificar el estado del servicio MySQL
    echo -e "${COLOR}Verificando el estado del servicio MySQL...${RESET}" | tee -a "$LOG_FILE"
    if systemctl is-active --quiet mysql; then
        echo -e "${GREEN}El servicio MySQL está activo.${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${RED}Error: El servicio MySQL no está activo.${RESET}"
        finalizar "${RED}Error: El servicio MySQL no está activo.${RESET}" 1
    fi
else
    echo -e "${GREEN}MySQL no encontrado. Continuando con la instalación de MariaDB...${RESET}" | tee -a "$LOG_FILE"
    DB_ENGINE="MariaDB"
    DB_SERVICE="mariadb"
    
    # Verificar si MariaDB ya está instalado
    echo -e "${COLOR}Verificando la instalación de MariaDB...${RESET}" | tee -a "$LOG_FILE"
    
    # Verifica si MariaDB ya está instalado
    if dpkg -l | grep -q mariadb-server; then
        echo -e "${GREEN}MariaDB ya está instalado. Omitiendo la instalación.${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${COLOR}MariaDB no encontrado. Instalando...${RESET}" | tee -a "$LOG_FILE"
        sudo apt-get update && sudo apt-get install -y mariadb-server mariadb-client | tee -a "$LOG_FILE"

        # Verifica si la instalación fue exitosa
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}MariaDB instalado con éxito!${RESET}" | tee -a "$LOG_FILE"
        else
            echo -e "${RED}Error: La instalación de MariaDB falló. Revisá el log para más detalles.${RESET}"
            finalizar "Error: La instalación de MariaDB falló. Revisá el log para más detalles." 1
        fi
    fi

    # Verificar si MariaDB exige contraseña para acceder
    if sudo mysql -u root -e "SELECT 1;" &>/dev/null; then
        MYSQL_CMD="sudo mysql -u root"
        echo -e "${GREEN}Conexión con MariaDB realizada sin contraseía.${RESET}" | tee -a "$LOG_FILE"
    else
        MYSQL_CMD="sudo MYSQL_PWD=$DB_PASS mysql -u root"
        echo -e "${YELLOW}MariaDB exige contraseña para conectarse. Usando la contraseña provista.${RESET}" | tee -a "$LOG_FILE"
    fi

    # Verificar la versión de MariaDB
    echo -e "${COLOR}Verificando la versión de MariaDB...${RESET}" | tee -a "$LOG_FILE"
    mariadb --version | tee -a "$LOG_FILE"

    # Verificar el estado del servicio MariaDB
    echo -e "${COLOR}Verificando el estado del servicio MariaDB...${RESET}" | tee -a "$LOG_FILE"
    if systemctl is-active --quiet mariadb; then
        echo -e "${GREEN}El servicio MariaDB está activo.${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${RED}Error: El servicio MariaDB no está activo.${RESET}"
        finalizar "${RED}Error: El servicio MariaDB no está activo.${RESET}" 1
    fi
fi

# Crear base de datos y configurar
echo -e "${COLOR}Crear la base de datos y configurar...${RESET}" | tee -a "$LOG_FILE"

# Verificar si la base de datos ya existe
echo -e "${COLOR}Verificando si la base de datos $NOME_EMPRESA ya existe...${RESET}" | tee -a "$LOG_FILE"
DB_EXISTS=$($MYSQL_CMD -N -s -e "SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='$NOME_EMPRESA';" 2>/dev/null)
if [ "$DB_EXISTS" = "$NOME_EMPRESA" ]; then
    echo -e "${GREEN}La base de datos $NOME_EMPRESA ya existe. El instalador usará la base de datos indicada.${RESET}" | tee -a "$LOG_FILE"
else
    # Crear la base de datos y configurar la autenticación correctamente
    echo -e "${COLOR}Creando la base de datos $NOME_EMPRESA...${RESET}" | tee -a "$LOG_FILE"

    # Verificar si la base de datos ya exige contraseña para conectarse
    if sudo mysql -u root -e "SELECT 1;" &>/dev/null; then
        echo -e "${GREEN}$DB_ENGINE es accesible sin contraseña. Definiendo contraseña para el usuario root...${RESET}" | tee -a "$LOG_FILE"
        
        {
            sudo mysql -u root <<EOF
    CREATE DATABASE IF NOT EXISTS $NOME_EMPRESA CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
    ALTER USER 'root'@'localhost' IDENTIFIED BY '$DB_PASS';
    FLUSH PRIVILEGES;
EOF
            echo -e "${GREEN}Base de datos creada y contraseña de root configurada con éxito.${RESET}"
        } | tee -a "$LOG_FILE"

    else
        echo -e "${YELLOW}$DB_ENGINE exige contraseña para conectarse. Creando solo la base de datos...${RESET}" | tee -a "$LOG_FILE"

        {
            sudo MYSQL_PWD=$DB_PASS mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS $NOME_EMPRESA CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
EOF
            echo -e "${GREEN}Base de datos creada con éxito.${RESET}"
        } | tee -a "$LOG_FILE"
    fi

    {
        echo -e "${COLOR}Reiniciando $DB_ENGINE...${RESET}"
        if sudo systemctl restart "$DB_SERVICE"; then
            echo -e "${GREEN}$DB_ENGINE reiniciado con éxito.${RESET}" | tee -a "$LOG_FILE"
        else
            finalizar "Error al reiniciar el servicio de $DB_ENGINE ($DB_SERVICE)." 1
        fi
    } | tee -a "$LOG_FILE"
fi

# Sección 3: Configuración del Usuario
echo -e "${COLOR}Configurando el usuario deploy...${RESET}" | tee -a "$LOG_FILE"

# Verificar si el usuario ya existe
if id "deploy" &>/dev/null; then
    echo -e "${GREEN}El usuario deploy ya existe. Cambiando al usuario deploy...${RESET}" | tee -a "$LOG_FILE"
else
    # Crear usuario si no existe
    echo -e "${COLOR}Creando usuario deploy...${RESET}" | tee -a "$LOG_FILE"
    adduser --disabled-password --gecos "" deploy
    echo "deploy:$SENHA_DEPLOY" | chpasswd
    echo -e "${GREEN}Usuario deploy creado con éxito.${RESET}" | tee -a "$LOG_FILE"

    # Otorgar privilegios de superusuario al usuario deploy
    echo -e "${COLOR}Otorgando privilegios de superusuario al usuario deploy...${RESET}" | tee -a "$LOG_FILE"
    usermod -aG sudo deploy
    echo -e "${GREEN}Privilegios de superusuario otorgados al usuario deploy.${RESET}" | tee -a "$LOG_FILE"
fi

# Cambiar al usuario deploy
echo -e "${COLOR}Cambiando al usuario deploy...${RESET}" | tee -a "$LOG_FILE"
sudo -u deploy -H bash -c "echo 'Usuario deploy configurado y listo para usar.'"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Cambio al usuario deploy exitoso.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al cambiar al usuario deploy.${RESET}"
    finalizar "${RED}Error al cambiar al usuario deploy.${RESET}" 1
fi

# Sección 4: Instalación de Node.js y Dependencias

# Descargando Node.js 22.x
echo -e "${COLOR}Descargando Node.js 22.x...${RESET}" | tee -a "$LOG_FILE"
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Node.js 22.x descargado con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al descargar Node.js 22.x. Verificá tu conexión a internet.${RESET}"
    finalizar "${RED}Error al descargar Node.js 22.x. Verificá tu conexión a internet.${RESET}" 1
fi

# Instalando Node.js
echo -e "${COLOR}Instalando Node.js y NPM...${RESET}" | tee -a "$LOG_FILE"
sudo apt-get install -y nodejs | tee -a "$LOG_FILE"
sudo npm install -g npm@latest | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
    NODE_VERSION=$(node -v)
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}Node.js (${NODE_VERSION}) y NPM (${NPM_VERSION}) instalados con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al instalar Node.js o NPM.${RESET}"
    finalizar "${RED}Error al instalar Node.js o NPM.${RESET}" 1
fi

# Instalando bibliotecas adicionales
echo -e "${COLOR}Instalando bibliotecas adicionales...${RESET}" | tee -a "$LOG_FILE"
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common git ffmpeg | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Bibliotecas adicionales instaladas con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al instalar bibliotecas adicionales.${RESET}"
    finalizar "${RED}Error al instalar bibliotecas adicionales.${RESET}" 1
fi

# Actualizando paquetes
echo -e "${COLOR}Actualizando paquetes...${RESET}" | tee -a "$LOG_FILE"
sudo apt-get update | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Paquetes actualizados con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al actualizar paquetes.${RESET}"
    finalizar "${RED}Error al actualizar paquetes.${RESET}" 1
fi

# Eliminando paquetes huérfanos
echo -e "${COLOR}Eliminando paquetes huérfanos...${RESET}" | tee -a "$LOG_FILE"
sudo apt-get autoremove -y | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Paquetes huérfanos eliminados con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${YELLOW}Aviso: No se pudieron eliminar todos los paquetes huérfanos.${RESET}" | tee -a "$LOG_FILE"
fi

# Reiniciar servicios que usan bibliotecas desactualizadas
{
    echo "Reiniciando servicios para aplicar las actualizaciones..."
    sudo systemctl daemon-reexec
    sudo systemctl restart cron.service
    sudo systemctl restart dbus.service
    sudo systemctl restart irqbalance.service
    sudo systemctl restart polkit.service
    sudo systemctl restart rsyslog.service
    sudo systemctl restart ssh.service

    echo -e "${GREEN}Reinicio de servicios completado.${RESET}"
} | tee -a "$LOG_FILE"

# Agregando el usuario actual al grupo MariaDB/MySQL
echo -e "${COLOR}Agregando el usuario actual al grupo MariaDB/MySQL...${RESET}" | tee -a "$LOG_FILE"

# Verifica si existe el grupo 'mariadb' o 'mysql'
MYSQL_GROUP=$(getent group mariadb | cut -d: -f1)
if [ -z "$MYSQL_GROUP" ]; then
    MYSQL_GROUP=$(getent group mysql | cut -d: -f1)
fi

# Si no se encuentra ninguno de los grupos, se detiene la instalación
if [ -z "$MYSQL_GROUP" ]; then
    echo -e "${RED}Error: No se encontró ningún grupo MariaDB/MySQL.${RESET}" | tee -a "$LOG_FILE"
    finalizar "Error: No se encontró ningún grupo MariaDB/MySQL. Verificá la instalación." 1
fi

# Agrega el usuario al grupo correcto
sudo usermod -aG "$MYSQL_GROUP" ${USER} | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Usuario agregado al grupo $MYSQL_GROUP con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al agregar el usuario al grupo $MYSQL_GROUP.${RESET}"
    finalizar "Error al agregar el usuario al grupo $MYSQL_GROUP." 1
fi

# Realizando el cambio de login para cargar las variables de entorno
echo -e "${GREEN}Realizando el cambio de login para el usuario actual sin interacción...${RESET}" | tee -a "$LOG_FILE"

{
    echo "$SENHA_DEPLOY" | sudo -S -u deploy bash -c "source ~/.bashrc"
} | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Cambio de login realizado con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al realizar el cambio de login.${RESET}"
    finalizar "${RED}Error al realizar el cambio de login.${RESET}" 1
fi

## Sección 5: Instalación de Chrome y Dependencias

# Instalando bibliotecas necesarias para Chrome
echo -e "${COLOR}Instalando bibliotecas necesarias para Chrome...${RESET}" | tee -a "$LOG_FILE"
sudo apt-get install -y \
    wget unzip fontconfig locales ca-certificates fonts-liberation lsb-release xdg-utils \
    libasound2 libatk1.0-0 libatk-bridge2.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgbm1 libgbm-dev libgcc-s1 libgdk-pixbuf2.0-0 libglib2.0-0 \
    libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 \
    libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxkbcommon0 \
    libxrandr2 libxrender1 libxshmfence1 libxss1 libxtst6 libnss3 libdrm2 libappindicator3-1 \
    libvulkan1 2>&1 | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Bibliotecas necesarias instaladas con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al instalar bibliotecas necesarias para Chrome.${RESET}"
    finalizar "${RED}Error al instalar bibliotecas necesarias para Chrome.${RESET}" 1
fi

# Descargando Google Chrome
echo -e "${COLOR}Descargando Google Chrome...${RESET}" | tee -a "$LOG_FILE"
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Google Chrome descargado con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al descargar Google Chrome.${RESET}"
    finalizar "${RED}Error al descargar Google Chrome.${RESET}" 1
fi

# Instalando Google Chrome
echo -e "${COLOR}Instalando Google Chrome...${RESET}" | tee -a "$LOG_FILE"
sudo apt-get install -y ./google-chrome-stable_current_amd64.deb | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Google Chrome instalado con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al instalar Google Chrome.${RESET}"
    finalizar "${RED}Error al instalar Google Chrome.${RESET}" 1
fi

# Eliminando el paquete de instalación de Google Chrome
echo -e "${COLOR}Eliminando el paquete de instalación de Google Chrome...${RESET}" | tee -a "$LOG_FILE"
sudo rm -f google-chrome-stable_current_amd64.deb | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Paquete de instalación eliminado con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al eliminar el paquete de instalación.${RESET}" | tee -a "$LOG_FILE"
fi

## Sección 6: Instalación de Press Ticket®

# Garantizar que se use el directorio home del usuario deploy
DEPLOY_HOME=$(eval echo ~deploy)

# Cambiar al usuario deploy y clonar el repositorio
echo -e "${COLOR}Clonando el repositorio como el usuario deploy...${RESET}" | tee -a "$LOG_FILE"
sudo -u deploy -H bash -c "cd $DEPLOY_HOME && git clone --branch $BRANCH https://github.com/Re1M0n/proit-press.git $NOME_EMPRESA" || finalizar "Error al clonar el repositorio." 1 # Manejo de error

# Obtener la versión instalada del repositorio clonado
echo -e "${COLOR}Verificando la versión instalada...${RESET}" | tee -a "$LOG_FILE"
INSTALLED_VERSION=$(sed -n 's/.*systemVersion *= *"\(v[0-9][0-9.]*\)".*/\1/p' "$DEPLOY_HOME/$NOME_EMPRESA/backend/src/config/version.ts" 2>/dev/null | head -n 1)
if [ -z "$INSTALLED_VERSION" ]; then
    INSTALLED_VERSION=$(cd "$DEPLOY_HOME/$NOME_EMPRESA" && git fetch --tags --force &>/dev/null && git describe --tags --abbrev=0 2>/dev/null || echo "")
fi

if [ -n "$INSTALLED_VERSION" ]; then
    echo -e "${GREEN}Versión detectada: $INSTALLED_VERSION${RESET}" | tee -a "$LOG_FILE"
else
    if [ -n "$VERSION" ] && [ "$VERSION" != "unknown" ]; then
        INSTALLED_VERSION="$VERSION"
        echo -e "${YELLOW}Aviso: No se pudo detectar la versión en el repositorio clonado. Usando la versión objetivo: $INSTALLED_VERSION${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${YELLOW}Aviso: No se pudo detectar la versión. Usando configuración predeterminada.${RESET}" | tee -a "$LOG_FILE"
        INSTALLED_VERSION="v999.0.0"  # Versão alta para usar npm install sem flag
    fi
fi

echo -e "${COLOR}Cambiando propietario y permisos de los archivos...${RESET}" | tee -a "$LOG_FILE"

# Cambiar el propietario de los archivos
sudo chown -R deploy:deploy "$DEPLOY_HOME/$NOME_EMPRESA" | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Propietario de los archivos cambiado con éxito al usuario 'deploy'.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error: Fallo al cambiar el propietario de los archivos. Verificá los permisos.${RESET}"
    finalizar ${RED}Error: Fallo al cambiar el propietario de los archivos. Verificá los permisos.${RESET} 1
fi

# Cambiar los permisos de los archivos
sudo chmod -R u+rwX "$DEPLOY_HOME/$NOME_EMPRESA" | tee -a "$LOG_FILE"
if [ $? -eq 0 ]; then
    echo -e "${GREEN}Permisos de los archivos ajustados con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error: Fallo al ajustar los permisos de los archivos. Verificá los permisos.${RESET}"
    finalizar "${RED}Error: Fallo al ajustar los permisos de los archivos. Verificá los permisos.${RESET}" 1
fi

echo -e "${GREEN}Propietario y permisos configurados correctamente para el directorio: $DEPLOY_HOME/$NOME_EMPRESA.${RESET}" | tee -a "$LOG_FILE"

# Verificar si el repositorio se clonó con éxito
if [ -d "$DEPLOY_HOME/$NOME_EMPRESA" ]; then
    echo -e "${GREEN}Repositorio clonado con éxito en el directorio del usuario deploy.${RESET}" | tee -a "$LOG_FILE"
else
    finalizar "Error: Directorio del repositorio no encontrado después de la clonación." 1
fi

## Sección 7: Configuración del Backend

# Generando las claves JWT_SECRET y JWT_REFRESH_SECRET
echo -e "${COLOR}Generando las claves JWT_SECRET y JWT_REFRESH_SECRET...${RESET}" | tee -a "$LOG_FILE"
JWT_SECRET=$(openssl rand -base64 32)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}JWT_SECRET generada con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al generar JWT_SECRET.${RESET}"
    finalizar "${RED}Error al generar JWT_SECRET.${RESET}" 1
fi

JWT_REFRESH_SECRET=$(openssl rand -base64 32)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}JWT_REFRESH_SECRET generada con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al generar JWT_REFRESH_SECRET.${RESET}"
    finalizar "${RED}Error al generar JWT_REFRESH_SECRET.${RESET}" 1
fi

# Editando el archivo .env
echo -e "${COLOR}Creando el archivo .env con las configuraciones...${RESET}" | tee -a "$LOG_FILE"
cat <<EOF >"$DEPLOY_HOME/$NOME_EMPRESA/backend/.env"
NODE_ENV=production

# Nombre de la Empresa
COMPANY_NAME=$NOME_EMPRESA
DEVICE_NAME=

# URLs y Puertos
BACKEND_URL=https://$URL_BACKEND
FRONTEND_URL=https://$URL_FRONTEND
WEBHOOK=https://$URL_BACKEND
PORT=$PORT_BACKEND
PROXY_PORT=443

# Ruta de Chrome
CHROME_BIN=/usr/bin/google-chrome-stable

# Datos de acceso a la base de datos
DB_DIALECT=mysql
DB_HOST=localhost
DB_TIMEZONE=-03:00
DB_USER=root
DB_PASS=$DB_PASS
DB_NAME=$NOME_EMPRESA

# Límite de Usuarios y Conexiones
USER_LIMIT=$USER_LIMIT
CONNECTIONS_LIMIT=$CONNECTION_LIMIT

# Nombre del PM2 del Frontend y Backend para poder reiniciarlo desde la pantalla de Conexiones
PM2_FRONTEND=${NOME_EMPRESA}-front
PM2_BACKEND=${NOME_EMPRESA}-back

# Modo DEMO que evita alterar algunas funciones, para activar: ON
DEMO=OFF

# Permitir la rotación de tokens
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Archivo .env creado con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${RED}Error al crear el archivo .env.${RESET}"
    finalizar "${RED}Error al crear el archivo .env.${RESET}" 1
fi

# Accediendo al directorio del backend y actualizando el email del seed
echo -e "${COLOR}Accediendo al directorio del backend y actualizando el email del seed...${RESET}" | tee -a "$LOG_FILE"

if cd "$DEPLOY_HOME/$NOME_EMPRESA/backend"; then
    echo -e "${GREEN}Directorio del backend accedido con éxito en: ${DEPLOY_HOME}/${NOME_EMPRESA}/backend.${RESET}" | tee -a "$LOG_FILE"

    SEED_FILE="src/database/seeds/20241118200400-create-masteradmin-user.ts"
    BACKUP_FILE="$SEED_FILE.bak"

    # Verifica si el archivo existe
    if [ ! -f "$SEED_FILE" ]; then
        echo -e "${RED}Error: Archivo de seed no encontrado: $SEED_FILE.${RESET}" | tee -a "$LOG_FILE"
        finalizar "Error: Archivo de seed no encontrado." 1
    fi

    # Realiza una copia de seguridad del archivo
    if ! cp "$SEED_FILE" "$BACKUP_FILE"; then
        echo -e "${RED}Error al crear la copia de seguridad del archivo de seed.${RESET}" | tee -a "$LOG_FILE"
        finalizar "Error al crear la copia de seguridad del archivo de seed." 1
    fi

    # Reemplaza el email en el archivo usando sed
    if ! sed -i "s/masteradmin@pressticket.com.br/$EMAIL/g" "$SEED_FILE"; then
        echo -e "${RED}Error al reemplazar el email en el archivo de seed.${RESET}" | tee -a "$LOG_FILE"
        if mv "$BACKUP_FILE" "$SEED_FILE"; then
            echo -e "${YELLOW}Archivo de seed restaurado con éxito.${RESET}" | tee -a "$LOG_FILE"
        else
            echo -e "${RED}Fallo al restaurar el archivo de seed. Verificá manualmente.${RESET}" | tee -a "$LOG_FILE"
        fi
        echo -e "${YELLOW}Continuando con la instalación, pero el email no se actualizó.${RESET}" | tee -a "$LOG_FILE"
    fi

    # Verifica si el reemplazo fue exitoso
    if grep -q "masteradmin@pressticket.com.br" "$SEED_FILE"; then
        echo -e "${YELLOW}Aviso: El email del MasterAdmin no se cambió correctamente. Verificá manualmente.${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${GREEN}Email del usuario MasterAdmin actualizado con éxito a: $EMAIL.${RESET}" | tee -a "$LOG_FILE"
    fi
else
    echo -e "${RED}Error al acceder al directorio del backend.${RESET}" | tee -a "$LOG_FILE"
    finalizar "Error al acceder al directorio del backend." 1
fi

# Obteniendo el email del MasterAdmin (después de la modificación del archivo)
echo -e "${COLOR}Obteniendo el email del MasterAdmin del archivo de seed...${RESET}" | tee -a "$LOG_FILE"

MASTERADMIN_EMAIL=$(grep "email:" "$SEED_FILE" | awk '{print $2}' | sed 's/[",]//g')

if [ -z "$MASTERADMIN_EMAIL" ]; then
    finalizar "Error al obtener el email del MasterAdmin del archivo de seed. Verificá el formato del archivo." 1
fi

echo -e "${GREEN}Email del MasterAdmin obtenido con éxito: $MASTERADMIN_EMAIL.${RESET}" | tee -a "$LOG_FILE"

# Instalando las dependencias
echo -e "${COLOR}Instalando dependencias del backend...${RESET}" | tee -a "$LOG_FILE"

if ! sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/backend && npm install"; then
    finalizar "Error al instalar dependencias del backend." 1
fi

echo -e "${GREEN}Dependencias del backend instaladas con éxito.${RESET}" | tee -a "$LOG_FILE"

# Compilando el backend
echo -e "${COLOR}Compilando el backend...${RESET}" | tee -a "$LOG_FILE"

if ! sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/backend && npm run build"; then
    finalizar "Error al compilar el backend." 1
fi

echo -e "${GREEN}Backend compilado con éxito.${RESET}" | tee -a "$LOG_FILE"

# ============================================================================
# Migraciones y seeds (solo se ejecutan si faltan)
# ============================================================================

echo -e "${COLOR}Verificando el estado de la base de datos...${RESET}" | tee -a "$LOG_FILE"

TABLE_COUNT=$($MYSQL_CMD -N -s -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='$NOME_EMPRESA';" 2>/dev/null | tr -d ' ')

if [ "${TABLE_COUNT:-0}" = "0" ]; then
    echo -e "${COLOR}No hay tablas. Ejecutando migraciones...${RESET}" | tee -a "$LOG_FILE"
    sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/backend && npx sequelize db:migrate" || finalizar "Error al ejecutar las migraciones de la base de datos." 1
    echo -e "${GREEN}Tablas creadas con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    PENDING_MIGRATIONS=$(cd "$DEPLOY_HOME/$NOME_EMPRESA/backend" && sudo -u deploy -H npx sequelize db:migrate:status 2>/dev/null | grep -c "down" || true)
    if [ "${PENDING_MIGRATIONS:-0}" -gt 0 ]; then
        echo -e "${COLOR}Hay ${PENDING_MIGRATIONS} migraciones pendientes. Ejecutando db:migrate...${RESET}" | tee -a "$LOG_FILE"
        sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/backend && npx sequelize db:migrate" || finalizar "Error al ejecutar las migraciones de la base de datos." 1
        echo -e "${GREEN}Migraciones aplicadas con éxito.${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${GREEN}Las migraciones ya están aplicadas. Omitiendo db:migrate.${RESET}" | tee -a "$LOG_FILE"
    fi
fi

# Seeds: solo si no existen usuarios administradores
ADMIN_COUNT=$($MYSQL_CMD -N -s -e "SELECT COUNT(*) FROM $NOME_EMPRESA.Users WHERE profile IN ('admin','masteradmin');" 2>/dev/null | tr -d ' ')

if [ "${ADMIN_COUNT:-0}" = "0" ]; then
    echo -e "${COLOR}No hay usuarios administradores. Insertando datos iniciales (seeds)...${RESET}" | tee -a "$LOG_FILE"
    sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/backend && npx sequelize db:seed:all" || finalizar "Error al insertar datos en las tablas." 1
    echo -e "${GREEN}Datos iniciales insertados con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${GREEN}Los datos iniciales ya existen (usuarios administradores). Omitiendo db:seed:all.${RESET}" | tee -a "$LOG_FILE"
fi

# Instalando PM2 (globalmente como root)
echo -e "${COLOR}Instalando PM2...${RESET}" | tee -a "$LOG_FILE"
sudo npm install -g pm2 | tee -a "$LOG_FILE" || finalizar "Error al instalar PM2 globalmente." 1

echo -e "${GREEN}PM2 instalado globalmente con éxito.${RESET}" | tee -a "$LOG_FILE"

# Iniciando el backend con PM2 (como usuario deploy)
echo -e "${COLOR}Iniciando el backend con PM2...${RESET}" | tee -a "$LOG_FILE"

if ! sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/backend && DBUS_SESSION_BUS_ADDRESS= pm2 start dist/server.js --name $NOME_EMPRESA-back"; then
    finalizar "Error al iniciar el backend con PM2." 1
fi

echo -e "${GREEN}Backend iniciado con éxito con PM2.${RESET}" | tee -a "$LOG_FILE"

# Configurando PM2 para inicio automático (para el usuario deploy)
echo -e "${COLOR}Configurando PM2 para inicio automático...${RESET}" | tee -a "$LOG_FILE"

# Ejecutando como root, pero especificando el usuario deploy
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u deploy --hp /home/deploy | tee -a "$LOG_FILE" || finalizar "Error al configurar PM2 para inicio automático." 1

echo -e "${GREEN}PM2 configurado para inicio automático con éxito para el usuario deploy.${RESET}" | tee -a "$LOG_FILE"

## Sección 8: Configuración del Frontend

# Criando o arquivo .env para o frontend
echo -e "${COLOR}Creando el archivo .env para el frontend...${RESET}" | tee -a "$LOG_FILE"
sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/frontend && cat <<EOF >.env
NODE_ENV=production

# URL BACKEND
REACT_APP_BACKEND_URL=https://$URL_BACKEND

# Tiempo de cierre automático de los tickets en horas
REACT_APP_HOURS_CLOSE_TICKETS_AUTO=

# Puerto del frontend
PORT=$PORT_FRONTEND

# Para permitir acceso solo del MasterAdmin (siempre ON)
REACT_APP_MASTERADMIN=ON
EOF" || finalizar "Error al crear el archivo .env del frontend." 1

echo -e "${GREEN}Archivo .env del frontend creado con éxito.${RESET}" | tee -a "$LOG_FILE"

# Instalando las dependencias
echo -e "${COLOR}Instalando dependencias del frontend...${RESET}" | tee -a "$LOG_FILE"

# Verificar la versión para decidir qué comando npm usar
version_compare "$INSTALLED_VERSION" "1.14.0"
VERSION_RESULT=$?

if [ $VERSION_RESULT -eq 1 ]; then
    # Versión < 1.14.0 - Usar --legacy-peer-deps
    echo -e "${YELLOW}Versión < 1.14.0 detectada. Usando npm install --legacy-peer-deps${RESET}" | tee -a "$LOG_FILE"
    NPM_INSTALL_CMD="npm install --legacy-peer-deps"
else
    # Versión >= 1.14.0 - Usar npm install normal
    echo -e "${GREEN}Versión >= 1.14.0 detectada. Usando npm install${RESET}" | tee -a "$LOG_FILE"
    NPM_INSTALL_CMD="npm install"
fi

if ! sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/frontend && $NPM_INSTALL_CMD"; then
    finalizar "Error al instalar dependencias del frontend." 1
fi

echo -e "${GREEN}Dependencias del frontend instaladas con éxito.${RESET}" | tee -a "$LOG_FILE"

# Compilando el frontend
echo -e "${COLOR}Compilando el frontend...${RESET}" | tee -a "$LOG_FILE"

if ! sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/frontend && npm run build"; then
    finalizar "Error al compilar el frontend." 1
fi

echo -e "${GREEN}Frontend compilado con éxito.${RESET}" | tee -a "$LOG_FILE"

# Iniciando o frontend com PM2
echo -e "${COLOR}Iniciando el frontend con PM2...${RESET}" | tee -a "$LOG_FILE"

if ! sudo -u deploy -H bash -c "cd $DEPLOY_HOME/$NOME_EMPRESA/frontend && pm2 start server.js --name ${NOME_EMPRESA}-front"; then
    finalizar "Error al iniciar el frontend con PM2." 1
fi

echo -e "${GREEN}Frontend iniciado con éxito con PM2.${RESET}" | tee -a "$LOG_FILE"

# Guardando la lista de procesos de PM2
echo -e "${COLOR}Guardando la lista de procesos de PM2...${RESET}" | tee -a "$LOG_FILE"

sudo -u deploy -H bash -c "pm2 save" || finalizar "Error al guardar la lista de procesos de PM2." 1

echo -e "${GREEN}Lista de procesos de PM2 guardada con éxito.${RESET}" | tee -a "$LOG_FILE"

# Verificando si los servicios PM2 están corriendo
echo -e "${COLOR}Verificando servicios PM2...${RESET}" | tee -a "$LOG_FILE"

# Listar procesos PM2
sudo -u deploy -H bash -c "pm2 list" | tee -a "$LOG_FILE"

# Verificar si el frontend está corriendo
if ! sudo -u deploy -H bash -c "pm2 list" | grep -q "${NOME_EMPRESA}-front"; then
    echo -e "${RED}Error: Proceso frontend (${NOME_EMPRESA}-front) no encontrado en PM2.${RESET}"
    finalizar "Error: El frontend no está corriendo en PM2." 1
fi

# Verificar si el backend está corriendo
if ! sudo -u deploy -H bash -c "pm2 list" | grep -q "${NOME_EMPRESA}-back"; then
    echo -e "${RED}Error: Proceso backend (${NOME_EMPRESA}-back) no encontrado en PM2.${RESET}"
    finalizar "Error: El backend no está corriendo en PM2." 1
fi

echo -e "${GREEN}Servicios PM2 verificados con éxito: ${NOME_EMPRESA}-front y ${NOME_EMPRESA}-back están corriendo.${RESET}" | tee -a "$LOG_FILE"

## Sección 9: Configuración de Nginx

# Instalando Nginx
echo -e "${COLOR}Instalando Nginx...${RESET}" | tee -a "$LOG_FILE"
sudo apt-get install -y nginx | tee -a "$LOG_FILE" || finalizar "Error al instalar Nginx." 1

echo -e "${GREEN}Nginx instalado con éxito.${RESET}" | tee -a "$LOG_FILE"

# Creando y configurando el archivo del frontend en Nginx
echo -e "${COLOR}Configurando el archivo del frontend en Nginx con Security Headers...${RESET}" | tee -a "$LOG_FILE"

if ! sudo tee /etc/nginx/sites-available/$NOME_EMPRESA-front <<EOF
server {
    server_name $URL_FRONTEND;
    
    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(self), microphone=(self), camera=(self), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.youtube.com https://www.youtube-nocookie.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https: blob:; media-src 'self' https: blob:; connect-src 'self' https://$URL_BACKEND wss://$URL_BACKEND https://restcountries.com https://viacep.com.br; frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self';" always;
    
    location / {
        proxy_pass http://127.0.0.1:$PORT_FRONTEND;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
then
    finalizar "Error al crear el archivo de configuración del frontend." 1
fi

echo -e "${GREEN}Archivo de configuración del frontend creado con éxito con Security Headers.${RESET}" | tee -a "$LOG_FILE"

# Creando y configurando el archivo del backend en Nginx
echo -e "${COLOR}Configurando el archivo del backend en Nginx...${RESET}" | tee -a "$LOG_FILE"

if ! sudo tee /etc/nginx/sites-available/$NOME_EMPRESA-back <<EOF
server {
    server_name $URL_BACKEND;
    location / {
        proxy_pass http://127.0.0.1:$PORT_BACKEND;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
then
    finalizar "Error al crear el archivo de configuración del backend." 1
fi

echo -e "${GREEN}Archivo de configuración del backend creado con éxito.${RESET}" | tee -a "$LOG_FILE"

# Creando enlaces simbólicos para los archivos de configuración
echo -e "${COLOR}Creando enlaces simbólicos para Nginx...${RESET}" | tee -a "$LOG_FILE"

if ! sudo ln -s /etc/nginx/sites-available/$NOME_EMPRESA-front /etc/nginx/sites-enabled; then
    finalizar "Error al crear el enlace simbólico para el frontend." 1
fi

if ! sudo ln -s /etc/nginx/sites-available/$NOME_EMPRESA-back /etc/nginx/sites-enabled; then
    finalizar "Error al crear el enlace simbólico para el backend." 1
fi

echo -e "${GREEN}Enlaces simbólicos creados con éxito.${RESET}" | tee -a "$LOG_FILE"

# Agregando configuración a nginx.conf (con verificación de existencia)
echo -e "${COLOR}Agregando configuración a nginx.conf...${RESET}" | tee -a "$LOG_FILE"

# Verifica si la línea client_max_body_size ya existe
if ! grep -q "client_max_body_size" /etc/nginx/nginx.conf; then
    # Agrega la línea si no existe
    if ! sudo sed -i '/http {/a \    client_max_body_size 100M;' /etc/nginx/nginx.conf; then
        finalizar "Error al agregar client_max_body_size a nginx.conf." 1
    fi
    echo -e "${GREEN}Configuración client_max_body_size agregada con éxito.${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${COLOR}La configuración client_max_body_size ya existe en nginx.conf. Omitiendo la adición.${RESET}" | tee -a "$LOG_FILE"
fi

# Probando y reiniciando Nginx
echo -e "${COLOR}Probando la configuración de Nginx...${RESET}" | tee -a "$LOG_FILE"
sudo nginx -t | tee -a "$LOG_FILE"

if [ $? -eq 0 ]; then
    echo -e "${COLOR}Reiniciando Nginx...${RESET}" | tee -a "$LOG_FILE" # Mensagem antes do reinício
    sudo service nginx restart | tee -a "$LOG_FILE"
    if [ $? -eq 0 ]; then # Verifica se o reinicio foi bem sucedido
        echo -e "${GREEN}Nginx reiniciado con éxito.${RESET}" | tee -a "$LOG_FILE"
    else
        finalizar "Error al reiniciar Nginx después de una prueba de configuración exitosa. Verificá los logs del sistema." 1
    fi
else
    finalizar "Error en la configuración de Nginx. Verificá el archivo de configuración y la salida de la prueba (arriba)." 1 # Mensagem mais específica
fi

## Sección 10: Instalación de Certificado SSL

# Instalando soporte para Snap y Certbot
echo -e "${COLOR}Verificando si Certbot ya está instalado...${RESET}" | tee -a "$LOG_FILE"
if certbot --version &>/dev/null; then
    echo -e "${GREEN}Certbot ya está instalado. Continuando...${RESET}" | tee -a "$LOG_FILE"
else
    echo -e "${COLOR}Certbot no encontrado. Instalando Snap y Certbot...${RESET}" | tee -a "$LOG_FILE"
    sudo apt-get update | tee -a "$LOG_FILE" || finalizar "Error al actualizar la lista de paquetes." 1
    sudo apt-get install -y snapd | tee -a "$LOG_FILE" || finalizar "Error al instalar snapd." 1
    sudo snap install --classic certbot | tee -a "$LOG_FILE" || finalizar "Error al instalar Certbot mediante snap." 1

    # Creando enlace simbólico para certbot (recomendado por Certbot)
    sudo ln -s /snap/bin/certbot /usr/bin/certbot | tee -a "$LOG_FILE" || finalizar "Error al crear el enlace simbólico para Certbot." 1

    echo -e "${GREEN}Certbot instalado con éxito.${RESET}" | tee -a "$LOG_FILE"
fi

# Generando certificado SSL para backend
echo -e "${COLOR}Generando certificado SSL para el backend...${RESET}" | tee -a "$LOG_FILE"
if ! certbot --nginx -d "$URL_BACKEND" -m "$EMAIL" --agree-tos --non-interactive; then
    finalizar "Error al generar el certificado SSL para el backend. Verificá los logs de Certbot y la configuración de Nginx." 1
fi
echo -e "${GREEN}Certificado SSL generado con éxito para el backend.${RESET}" | tee -a "$LOG_FILE"

# Generando certificado SSL para frontend
echo -e "${COLOR}Generando certificado SSL para el frontend...${RESET}" | tee -a "$LOG_FILE"
if ! certbot --nginx -d "$URL_FRONTEND" -m "$EMAIL" --agree-tos --non-interactive; then
    finalizar "Error al generar el certificado SSL para el frontend. Verificá los logs de Certbot y la configuración de Nginx." 1
fi
echo -e "${GREEN}Certificado SSL generado con éxito para el frontend.${RESET}" | tee -a "$LOG_FILE"

# Configurando la renovación automática de los certificados SSL
echo -e "${COLOR}Configurando la renovación automática de certificados SSL...${RESET}" | tee -a "$LOG_FILE"

# Verifica si la tarea de renovación ya existe en el crontab
if ! crontab -l | grep -q "certbot renew --quiet --nginx"; then
    # Agrega la tarea al cron si no está configurada
    (
        crontab -l 2>/dev/null
        echo "0 3 */30 * * certbot renew --quiet --nginx"
    ) | crontab -
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Renovación automática configurada con éxito en el cron para ejecutarse cada 30 días.${RESET}" | tee -a "$LOG_FILE"
    else
        echo -e "${RED}Error al configurar la renovación automática en el cron.${RESET}"
        finalizar "${RED}Error al configurar la renovación automática en el cron.${RESET}" 1
    fi
else
    echo -e "${GREEN}La renovación automática ya está configurada en el cron.${RESET}" | tee -a "$LOG_FILE"
fi

# Finalizando instalación
{
    echo " "
    echo -e "${COLOR}Instalación finalizada con éxito para la empresa: $NOME_EMPRESA!${RESET}"
    echo " "
} | tee -a "$LOG_FILE"

# Registrar fin de la instalación
END_TIME=$(date +%s)

# Calcular el tiempo total de ejecución
TOTAL_TIME=$((END_TIME - START_TIME))
TOTAL_MINUTES=$((TOTAL_TIME / 60))
TOTAL_SECONDS=$((TOTAL_TIME % 60))

# Mostrar el tiempo de ejecución
{
    echo -e "${BOLD}======== Tiempo de Instalación: ========${RESET}" | tee -a "$LOG_FILE"
    echo -e "${BOLD}Total:${RESET} ${TOTAL_MINUTES} minuto(s) e ${TOTAL_SECONDS} segundo(s)." | tee -a "$LOG_FILE"
    echo -e "${GREEN}-----------------------------------${RESET}" | tee -a "$LOG_FILE"
} | tee -a "$LOG_FILE"

# Mostrando resumen de la instalación
echo -e "${BOLD}======== Resumen de la Instalación: ========${RESET}" | tee -a "$LOG_FILE"
echo -e "${GREEN}---------------------------------------${RESET}" | tee -a "$LOG_FILE"
echo -e "${BOLD}URL de Acceso:${RESET} https://$URL_FRONTEND" | tee -a "$LOG_FILE"
echo -e "${BOLD}Nombre de la Instalación:${RESET} $NOME_EMPRESA" | tee -a "$LOG_FILE"
echo -e "${BOLD}Cantidad de Usuarios Permitidos:${RESET} $USER_LIMIT" | tee -a "$LOG_FILE"
echo -e "${BOLD}Cantidad de Conexiones Permitidas:${RESET} $CONNECTION_LIMIT" | tee -a "$LOG_FILE"
echo -e "${BOLD}---------------------------------------${RESET}" | tee -a "$LOG_FILE"

# Información de Usuarios
echo -e "${BOLD}Usuario Estándar para Acceso${RESET}" | tee -a "$LOG_FILE"
echo -e "${BOLD}Usuário:${RESET} admin@pressticket.com.br" | tee -a "$LOG_FILE"
echo -e "${BOLD}Senha:${RESET} admin" | tee -a "$LOG_FILE"
echo -e "${BOLD}---------------------------------------${RESET}" | tee -a "$LOG_FILE"
echo -e "${BOLD}Usuario Master para Acceso${RESET}" | tee -a "$LOG_FILE"
echo -e "${BOLD}Usuário:${RESET} ${MASTERADMIN_EMAIL}" | tee -a "$LOG_FILE"
echo -e "${BOLD}Senha:${RESET} masteradmin" | tee -a "$LOG_FILE"
echo -e "${GREEN}---------------------------------------${RESET}" | tee -a "$LOG_FILE"

# Mensaje final
echo " " | tee -a "$LOG_FILE"
echo -e "${COLOR}Accedé al sistema y configuralo según sea necesario.${RESET}" | tee -a "$LOG_FILE"
echo " " | tee -a "$LOG_FILE"
echo -e "${COLOR}¡Gracias por usar el Sistema Press Ticket®!${RESET}" | tee -a "$LOG_FILE"
echo -e "${COLOR}************** Desde 2022 ****************${RESET}" | tee -a "$LOG_FILE"
echo " " | tee -a "$LOG_FILE"

# Asegurate de que la última línea termine correctamente:
finalizar "Instalación finalizada con éxito para la empresa: $NOME_EMPRESA!" 0
