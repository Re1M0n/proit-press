const messages = {
  es: {
    translations: {
    all: "Todos",
    none: "Ninguno",
    apiKey: {
      title: "Gestor de Tokens",
      button: {
        new: "Nuevo Token",
        copy: "Copiar Token",
        delete: "Eliminar Token"
      },
      categories: {
        contacts: "Contactos",
        messages: "Mensajes",
        queues: "Sectores",
        tags: "Etiquetas",
        tickets: "Tickets",
        whatsapp: "WhatsApp",
        whatsappSession: "Sesiones de WhatsApp",
        activityLogs: "Logs de actividad",
        backups: "Backups",
        errorLogs: "Logs de error",
        networkStatus: "Monitoreo de red",
        queueMonitor: "Monitoreo de sectores",
        systemUpdate: "Actualización del sistema",
        versionWhatsapp: "Versión y librería WhatsApp",
        systemResources: "Sistema y recursos",
        videos: "Videos",
        users: "Usuarios",
        quickAnswers: "Respuestas rápidas",
        clientStatus: "Estado de clientes",
        whatsappGroups: "Grupos de WhatsApp",
        presence: "Presencia (indicadores)",
        authentication: "Autenticación"
      },
      permissions: {
        createContacts: "Crear contactos",
        readContacts: "Ver contactos",
        updateContacts: "Editar contactos",
        deleteContacts: "Eliminar contactos",
        createMessages: "Enviar mensajes",
        readMessages: "Ver mensajes",
        updateMessages: "Editar mensajes",
        deleteMessages: "Borrar mensajes",
        createQueue: "Crear sectores",
        readQueue: "Ver sectores",
        updateQueue: "Editar sectores",
        deleteQueue: "Eliminar sectores",
        createTags: "Crear etiquetas",
        readTags: "Ver etiquetas",
        updateTags: "Editar etiquetas",
        deleteTags: "Eliminar etiquetas",
        createTickets: "Crear tickets",
        readTickets: "Ver tickets",
        updateTickets: "Editar tickets",
        deleteTickets: "Eliminar tickets",
        createWhatsapp: "Crear conexiones",
        readWhatsapp: "Ver conexiones",
        updateWhatsapp: "Editar conexiones",
        deleteWhatsapp: "Eliminar conexiones",
        createWhatsappSession: "Crear sesiones",
        updateWhatsappSession: "Editar sesiones",
        deleteWhatsappSession: "Eliminar sesiones",
        readActivityLogs: "Ver logs de actividad",
        createBackups: "Crear backups",
        readBackups: "Ver backups",
        updateBackups: "Restaurar backups",
        deleteBackups: "Eliminar backups",
        createErrorLogs: "Registrar logs de error",
        readErrorLogs: "Ver logs de error",
        deleteErrorLogs: "Limpiar logs de error",
        readNetworkStatus: "Ver estado de la red",
        readQueueMonitor: "Ver monitoreo de sectores",
        readSystemUpdate: "Verificar actualizaciones del sistema",
        writeSystemUpdate: "Instalar actualizaciones del sistema",
        readVersion: "Consultar versión del sistema",
        writeWhatsappLib: "Actualizar librería de WhatsApp",
        writeSystem: "Reiniciar servicios del sistema",
        readSystemResources: "Monitorear recursos del sistema",
        readVideos: "Ver videos",
        writeVideos: "Gestionar videos",
        createUsers: "Crear usuarios",
        readUsers: "Ver usuarios",
        updateUsers: "Editar usuarios",
        deleteUsers: "Eliminar usuarios",
        createQuickAnswers: "Crear respuestas rápidas",
        readQuickAnswers: "Ver respuestas rápidas",
        updateQuickAnswers: "Editar respuestas rápidas",
        deleteQuickAnswers: "Eliminar respuestas rápidas",
        createClientStatus: "Crear estado de clientes",
        readClientStatus: "Ver estado de clientes",
        updateClientStatus: "Editar estado de clientes",
        deleteClientStatus: "Eliminar estado de clientes",
        readGroups: "Ver grupos de WhatsApp",
        writeGroups: "Gestionar grupos de WhatsApp",
        writePresence: "Enviar indicadores de escritura/grabación",
        readProfile: "Acceder al perfil (logout)"
      },
      messages: {
        success: {
          copy: "Token copiado con éxito",
          created: "Token creado con éxito",
          deleted: "Token eliminado con éxito"
        },
        error: {
          create: "Error al crear el token",
          delete: "Error al eliminar el token",
          nameExists: "Ya existe un token con este nombre"
        },
        noTokens: "No se encontró ningún token"
      },
      modal: {
        title: "Crear nuevo token",
        name: "Nombre",
        permissions: "Permisos",
        permissionsRequired: "Seleccione al menos un permiso",
        buttons: {
          cancel: "Cancelar",
          save: "Guardar",
          selectAll: "Seleccionar todas",
          unselectAll: "Desmarcar todas"
        }
      },
      confirmationModal: {
        message: "¿Está seguro de que desea eliminar este token?"
      },
      table: {
        name: "Nombre",
        token: "Token",
        permissions: "Permisos",
        created_at: "Creado en:",
        actions: "Acción"
      }
    },
    auth: {
      toasts: {
        success: "¡Inicio de sesión exitoso!",
        session_expired: "Tu sesión ha expirado porque se inició en otro dispositivo.",
        user_inactive: "Usuario desactivado. Por favor, contacte al administrador."
      }
    },
    backup: {
      title: "Backup y restauración DB",
      refresh: "Actualizar",
      nameLabel: "Nombre del backup",
      namePlaceholder: "Escriba un nombre para el backup",
      create: "Crear backup",
      creating: "Creando...",
      import: "Importar backup",
      importing: "Importando...",
      filename: "Nombre del archivo",
      size: "Tamaño",
      createdAt: "Creado en",
      actions: "Acciones",
      noBackups: "No se encontraron backups",
      download: "Descargar",
      restore: "Restaurar",
      delete: "Eliminar",
      loadError: "Error al cargar los backups",
      createSuccess: "¡Backup creado con éxito!",
      createError: "Error al crear el backup",
      importSuccess: "¡Backup importado con éxito!",
      importError: "Error al importar el backup",
      downloadError: "Error al descargar el archivo de backup",
      deleteSuccess: "¡Backup eliminado con éxito!",
      deleteError: "Error al eliminar el backup",
      restoreSuccess: "¡Backup restaurado con éxito!",
      restoreError: "Error al restaurar el backup",
      confirmDeleteTitle: "Confirmar eliminación",
      confirmDeleteMessage: "¿Está seguro de que desea eliminar el backup {{name}}?",
      confirmRestoreTitle: "Confirmar restauración",
      confirmRestoreMessage: "¿Está seguro de que desea restaurar el backup {{name}}? ¡Esto reemplazará todos los datos actuales!",
      cancelButton: "Cancelar",
      confirmButton: "Confirmar"
    },
    chat: {
      noTicketMessage: "Seleccione un ticket para comenzar a conversar."
    },
    confirmationModal: {
      buttons: {
        confirm: "Ok",
        cancel: "Cancelar"
      }
    },
    channels: {
      title: "Canales",
      toasts: {
        deleted: "¡Canal eliminado con éxito!"
      },
      confirmationModal: {
        deleteTitle: "Eliminar",
        deleteMessage: "¿Está seguro? Esta acción no se puede deshacer.",
        disconnectTitle: "Desconectar",
        disconnectMessage: "¿Está seguro? Deberá escanear el código QR nuevamente."
      },
      buttons: {
        wwebjs: "Agregar",
        addChannel: "Agregar canal",
        addTelegram: "Agregar Telegram",
        shutdown: "Eliminar sesión",
        restart: "Reiniciar",
        disconnect: "Desconectar",
        tryAgain: "Intentar nuevamente",
        qrcode: "QR CODE",
        newQr: "Nuevo QR CODE",
        connecting: "Conectando",
        edit: "Editar canal",
        delete: "Eliminar canal",
        start: "Iniciar sesión"
      },
      toolTips: {
        disconnected: {
          title: "Error al iniciar la sesión de WhatsApp",
          content: "Asegúrese de que su teléfono esté conectado a Internet e intente nuevamente, o solicite un nuevo QR Code"
        },
        qrcode: {
          title: "Esperando la lectura del QR Code",
          content: "Haga clic en el botón 'QR CODE' y escanee el QR Code con su teléfono para iniciar la sesión"
        },
        connected: {
          title: "¡Conexión establecida!"
        },
        timeout: {
          title: "Se perdió la conexión con el teléfono",
          content: "Asegúrese de que su teléfono esté conectado a Internet y que WhatsApp esté abierto, o haga clic en el botón 'Desconectar' para obtener un nuevo QR Code"
        }
      },
      table: {
        id: "ID",
        channel: "Canal",
        name: "Nombre",
        color: "Color",
        number: "Número",
        status: "Estado",
        lastUpdate: "Última actualización",
        default: "Predeterminado",
        actions: "Acciones",
        session: "Sesión"
      }
    },
    contactModal: {
      title: {
        add: "Agregar contacto",
        edit: "Editar contacto"
      },
      form: {
        mainInfo: "Datos del contacto",
        extraInfo: "Información adicional",
        name: "Nombre",
        number: "Número de WhatsApp",
        email: "Correo electrónico",
        address: "Dirección",
        extraName: "Nombre del campo",
        extraValue: "Valor"
      },
      buttons: {
        addExtraInfo: "Agregar información",
        okAdd: "Agregar",
        okEdit: "Guardar",
        cancel: "Cancelar"
      },
      success: "Contacto guardado con éxito.",
      numberError: "Número de WhatsApp inválido. Por favor, verifique e intente nuevamente."
    },
    contacts: {
      title: "Contactos",
      toasts: {
        deleted: "¡Contacto eliminado con éxito!",
        deletedAll: "¡Todos los contactos eliminados con éxito!",
        redirectTicket: "Ya tiene un ticket abierto para este contacto. Redirigiendo...",
        exportSuccess: "¡Contactos exportados con éxito!",
        noContactsToExport: "No hay contactos para exportar.",
        blocked: "Contacto bloqueado en WhatsApp",
        unblocked: "Contacto desbloqueado en WhatsApp"
      },
      errors: {
        ticketAlreadyOpen: "Ya existe un ticket abierto para este contacto, asignado al Agente: *{{userName}}* en el Canal: *{{userChannel}}* creado en: *{{ticketCreatedAt}}*.",
        exportError: "Error al exportar los contactos."
      },
      searchPlaceholder: "Buscar...",
      confirmationModal: {
        deleteTitle: "Eliminar ",
        deleteAllTitle: "Eliminar Todos",
        importTitle: "Importar contactos",
        deleteMessage: "¿Está seguro de que desea eliminar este contacto? Todos los tickets relacionados se perderán.",
        deleteAllMessage: "¿Está seguro de que desea eliminar todos los contactos? Todos los tickets relacionados se perderán.",
        importMessage: "¿Desea importar todos los contactos del teléfono?"
      },
      buttons: {
        import: "Importar Contactos",
        add: "Agregar Contacto",
        export: "Exportar Contactos",
        delete: "Eliminar Todos los Contactos",
        block: "Bloquear",
        unblock: "Desbloquear"
      },
      table: {
        name: "Nombre",
        whatsapp: "WhatsApp",
        type: "Tipo",
        address: "Dirección",
        channels: "Canales",
        actions: "Acciones"
      },
      filters: {
        status: "Filtrar por estado",
        allStatus: "Todos los estados"
      },
      exportModal: {
        title: "Seleccionar campos para exportar",
        selectAll: "Seleccionar todos",
        deselectAll: "Desmarcar todos",
        selectedCount: "{{count}} de {{total}} campos seleccionados",
        groups: {
          basic: "Información básica",
          personal: "Datos personales",
          address: "Dirección",
          custom: "Campos personalizados",
          dates: "Fechas"
        },
        fields: {
          id: "ID",
          name: "Nombre",
          number: "Número",
          email: "Email",
          cpf: "DNI",
          birthdate: "Fecha de nacimiento",
          gender: "Género",
          status: "Estado",
          address: "Dirección",
          addressNumber: "Número",
          addressComplement: "Complemento",
          neighborhood: "Barrio",
          city: "Ciudad",
          state: "Provincia",
          zip: "Código postal",
          country: "País",
          isGroup: "Es grupo",
          profilePicUrl: "Foto de perfil",
          extraInfo: "Información extra",
          tags: "Etiquetas",
          createdAt: "Fecha de creación",
          updatedAt: "Fecha de actualización",
          lastContactAt: "Último contacto"
        },
        buttons: {
          cancel: "Cancelar",
          export: "Exportar ({{count}} campos)"
        }
      },
      exportProgress: {
        title: "Exportando contactos",
        preparing: "Preparando la exportación...",
        fetching: "Buscando contactos...",
        processing: "Procesando datos...",
        finishing: "Finalizando..."
      }
    },
    contactDrawer: {
      header: "Datos del contacto",
      buttons: {
        edit: "Editar contacto"
      },
      extraInfo: "Otra información"
    },
    common: {
      search: "Buscar",
      selected: "seleccionados",
      cancel: "Cancelar",
      confirm: "Confirmar",
      refresh: "Actualizar",
      close: "Cerrar"
    },
    messageReactions: {
      youReacted: "Reaccionaste",
      you: "Vos"
    },
    groupActions: {
      selectContacts: "Seleccionar contactos",
      title: "Acciones del grupo",
      buttons: {
        add: "Agregar participantes",
        remove: "Quitar participantes",
        promote: "Promover admins",
        demote: "Degradar admins",
        getInvite: "Copiar enlace de invitación",
        revokeInvite: "Revocar enlace",
        subject: "Cambiar título",
        description: "Cambiar descripción",
        setPicture: "Cambiar foto",
        deletePicture: "Quitar foto",
        leave: "Salir del grupo",
        listRequests: "Listar solicitudes",
        approveRequests: "Aprobar solicitudes",
        rejectRequests: "Rechazar solicitudes"
      },
      switches: {
        memberAddMode: "Solo los admins pueden agregar",
        announcement: "Solo los admins pueden enviar mensajes",
        restrict: "Solo los admins pueden editar información"
      },
      prompts: {
        participantsPlaceholder: "Ingrese IDs separados por coma (ej.: 5511999999999@c.us)",
        requestersPlaceholder: "Ingrese los IDs de los solicitantes (opcional, coma)",
        subject: "Nuevo asunto del grupo:",
        description: "Nueva descripción del grupo:",
        pictureUrl: "URL de la imagen (se descargará y enviará como foto del grupo)"
      },
      messages: {
        addOk: "Participantes agregados (o invitación enviada).",
        addErr: "Error al agregar participantes.",
        removeOk: "Participantes eliminados.",
        removeErr: "Error al eliminar participantes.",
        promoteOk: "Participantes promovidos a admin.",
        promoteErr: "Error al promover participantes.",
        demoteOk: "Participantes degradados.",
        demoteErr: "Error al degradar participantes.",
        inviteCopied: "Enlace de invitación copiado al portapapeles.",
        inviteErr: "Error al obtener el enlace de invitación.",
        inviteNone: "No fue posible obtener el código de invitación.",
        inviteRevoked: "Nuevo enlace generado y copiado.",
        inviteRevokeErr: "Error al revocar el enlace de invitación.",
        settingsOk: "Configuraciones actualizadas.",
        settingsErr: "Error al actualizar las configuraciones.",
        subjectOk: "Asunto actualizado.",
        subjectErr: "Error al actualizar el asunto.",
        descriptionOk: "Descripción actualizada.",
        descriptionErr: "Error al actualizar la descripción.",
        pictureOk: "Foto del grupo actualizada.",
        pictureErr: "Error al actualizar la foto del grupo.",
        pictureDelOk: "Foto del grupo eliminada.",
        pictureDelErr: "Error al eliminar la foto del grupo.",
        leaveOk: "Salida del grupo realizada.",
        leaveErr: "Error al salir del grupo.",
        noRequests: "Sin solicitudes pendientes.",
        requestsErr: "Error al listar las solicitudes.",
        requestsApproveOk: "Solicitudes aprobadas.",
        requestsApproveErr: "Error al aprobar las solicitudes.",
        requestsRejectOk: "Solicitudes rechazadas.",
        requestsRejectErr: "Error al rechazar las solicitudes."
      },
      modals: {
        subjectTitle: "Cambiar nombre del grupo",
        subjectLabel: "Nombre del grupo",
        descriptionTitle: "Cambiar descripción del grupo",
        descriptionLabel: "Descripción del grupo",
        removeTitle: "Quitar participantes",
        promoteTitle: "Promover a admin",
        demoteTitle: "Degradar admin",
        owner: "Dueño",
        admin: "Admin",
        noMembers: "No se encontraron miembros",
        save: "Guardar",
        cancel: "Cancelar"
      }
    },
    copyToClipboard: {
      copy: "Copiar",
      copied: "Copiado"
    },
    cpuUsage: {
      title: "Uso de CPU",
      infoIcon: "CPU del sistema",
      modelCPU: "Modelo",
      cores: "Núcleos",
      threads: "Hilos",
      frequency: "Frecuencia",
      uptime: "Uptime",
      topProcesses: "Procesos con mayor consumo de CPU",
      pid: "PID",
      process: "Proceso",
      user: "Usuario",
      cpuUsage: "Uso de CPU",
      cpuTime: "Tiempo de CPU",
      noProcessesFound: "No se encontraron procesos",
      systemCpu: "CPU del sistema"
    },
    dashboard: {
      messages: {
        inAttendance: {
          title: "En Atención"
        },
        waiting: {
          title: "En Espera"
        },
        closed: {
          title: "Finalizado"
        },
        sent: {
          title: "Mensajes enviados",
          titleAdmin: "Mensajes totales enviados"
        },
        received: {
          title: "Mensajes recibidos",
          titleAdmin: "Mensajes totales recibidos"
        }
      },
      charts: {
        perDay: {
          title: "Tickets por día: "
        },
        date: {
          start: "Fecha inicial",
          end: "Fecha final",
          title: "Filtrar"
        },
        perConnection: {
          date: {
            start: "Fecha inicial",
            end: "Fecha final"
          },
          perConnection: {
            title: "Tickets por canales"
          }
        },
        perQueue: {
          title: "Tickets por sector",
          date: {
            start: "Fecha inicial",
            end: "Fecha final"
          }
        }
      },
      chartPerUser: {
        title: "Tickets por usuario",
        ticket: "Ticket",
        date: {
          start: "Fecha inicial",
          end: "Fecha final",
          title: "Filtrar"
        }
      },
      chartPerConnection: {
        date: {
          start: "Fecha inicial",
          end: "Fecha final",
          title: "Filtrar"
        },
        perConnection: {
          title: "Tickets por Canales"
        }
      },
      chartPerQueue: {
        date: {
          start: "Fecha inicial",
          end: "Fecha final",
          title: "Filtrar"
        },
        perQueue: {
          title: "Tickets por Sector"
        }
      },
      ChartMessages: {
        title: "Mensajes por usuario",
        noUser: "Sin usuario",
        messages: {
          sent: "Enviadas",
          received: "Recibidas"
        },
        date: {
          start: "Fecha inicial",
          end: "Fecha final"
        }
      },
      newContacts: {
        contact: "Contactos",
        date: {
          start: "Fecha de inicio",
          end: "Fecha de finalización"
        },
        title: "Contactos nuevos por día"
      },
      contactsWithTickets: {
        message: "No se encontraron contactos para esta fecha.",
        unique: "Contacto único",
        date: {
          start: "Fecha de inicio",
          end: "Fecha de finalización"
        },
        title: "Contactos que abrieron tickets en el período"
      },
      tags: {
        cloudTitle: "Etiquetas: ",
        noTags: "¡Sin etiquetas por el momento!"
      },
      users: {
        title: "Usuarios en línea"
      },
      clientStatus: {
        pieChart: {
          title: "Distribución de contactos por estado"
        },
        barChart: {
          title: "Cantidad de contactos por estado"
        },
        withoutStatus: "Sin estado",
        totalContacts: "Total de contactos",
        withStatusLabel: "Con estado",
        withoutStatusLabel: "Sin estado",
        contactsCount: "Cantidad de contactos",
        loading: "Cargando estadísticas...",
        noData: "No hay datos disponibles"
      }
    },
    diskSpace: {
      title: "Espacio en disco",
      systemFolder: "Carpeta del sistema",
      systemDisk: "Disco del sistema",
      used: "utilizado",
      healthy: "Saludable",
      warning: "Atención",
      critical: "Crítico",
      folderSize: "Tamaño de la carpeta",
      freeSpace: "Espacio libre",
      totalSpace: "Espacio total",
      criticalWarning: "Atención: el espacio en disco está en estado crítico. Recomendamos liberar espacio de inmediato para evitar problemas en el sistema.",
      warningMessage: "Atención: el espacio en disco se está agotando. Considere liberar espacio para evitar problemas futuros.",
      folders: "Carpetas",
      folderName: "Nombre",
      size: "Tamaño",
      percentage: "Porcentaje",
      noFoldersFound: "No se encontraron carpetas"
    },
    memoryUsage: {
      title: "Uso de memoria RAM",
      systemMemory: "Memoria del sistema",
      used: "utilizado",
      healthy: "Saludable",
      warning: "Atención",
      critical: "Crítico",
      totalMemory: "Memoria total",
      usedMemory: "Memoria utilizada",
      freeMemory: "Memoria libre",
      cachedMemory: "Memoria en caché",
      availableMemory: "Memoria disponible",
      criticalWarning: "Atención: el uso de memoria RAM está en estado crítico. Recomendamos reiniciar algunos servicios o el sistema para evitar problemas.",
      warningMessage: "Atención: el uso de memoria RAM está alto. Monitoree el sistema para evitar problemas de rendimiento.",
      topProcesses: "Procesos con mayor consumo",
      pid: "PID",
      process: "Proceso",
      memoryUsage: "Uso de memoria",
      percentage: "Porcentaje",
      noProcesses: "No se encontraron procesos."
    },
    errorLogs: {
      title: "Log de errores",
      searchPlaceholder: "Buscar por mensaje de error...",
      loading: "Cargando logs...",
      noRecords: "No se encontraron logs.",
      table: {
        id: "ID",
        date: "Fecha",
        source: "Origen",
        severity: "Severidad",
        message: "Mensaje",
        actions: "Acciones"
      },
      logDetails: {
        title: "Detalles del log",
        date: "Fecha",
        source: "Origen",
        severity: "Severidad",
        component: "Componente",
        userId: "ID del usuario",
        user: "Nombre del usuario",
        url: "URL",
        message: "Mensaje",
        stack: "Stack Trace",
        userAgent: "Navegador"
      },
      filter: {
        title: "Filtros",
        source: "Origen",
        severity: "Severidad",
        startDate: "Fecha inicial",
        endDate: "Fecha final",
        all: "Todos",
        cancel: "Cancelar",
        reset: "Limpiar",
        apply: "Aplicar"
      },
      delete: {
        title: "Eliminar Logs Antiguos",
        cancel: "Cancelar",
        confirm: "Eliminar",
        confirmation: "Esta acción eliminará todos los logs de más de 30 días. Esta acción no se puede deshacer. ¿Desea continuar?"
      },
      detail: {
        title: "Detalles del log",
        loading: "Cargando detalles...",
        component: "Componente",
        url: "URL",
        user: "Nombre del usuario",
        userAgent: "Navegador",
        stack: "Stack Trace",
        close: "Cerrar"
      },
      noLogsToDownload: "No hay logs para descargar",
      deleteDialog: {
        title: "Eliminar logs antiguos",
        message: "Esta acción eliminará todos los logs de más de 30 días. Esta acción no se puede deshacer. ¿Desea continuar?"
      },
      pagination: {
        rowsPerPage: "Filas por página",
        of: "de"
      },
      buttons: {
        search: "Buscar",
        filter: "Filtrar",
        refresh: "Actualizar",
        download: "Descargar",
        deleteOld: "Eliminar antiguos",
        close: "Cerrar",
        clearFilters: "Limpiar filtros",
        cancel: "Cancelar",
        applyFilters: "Aplicar filtros",
        confirm: "Confirmar"
      },
      fetchError: "Error al cargar los logs",
      loadMoreError: "Error al cargar más logs",
      deleteError: "Error al eliminar los logs antiguos",
      deleteSuccess: "Logs antiguos eliminados con éxito",
      detailError: "Error al buscar los detalles del log",
      downloadError: "Error al descargar los logs",
      downloadSuccess: "Logs descargados con éxito",
      usingLocalLog: "Usando el log almacenado localmente"
    },
    "Banco": "Base de datos",
    "Comando": "Comando",
    "Conexões Ativas": "Conexiones Activas",
    "Consulta": "Consulta",
    "Consultas Lentas (últimas 24h)": "Consultas Lentas (últimas 24 h)",
    "Consultas Lentas": "Consultas Lentas",
    "Desempenho": "Rendimiento",
    "Dialeto": "Dialecto",
    "Erro ao carregar dados do banco de dados": "Error al cargar los datos de la base de datos",
    "Estado": "Estado",
    "Hora de Início": "Hora de Inicio",
    "Host": "Host",
    "ID": "ID",
    "Informações Gerais": "Información General",
    "Linhas Examinadas": "Filas Examinadas",
    "Linhas": "Filas",
    "Monitoramento do Banco de Dados": "Monitoreo de la Base de Datos",
    "Nenhum processo ativo encontrado": "Ningún proceso activo encontrado",
    "Nenhuma consulta lenta encontrada": "Ninguna consulta lenta encontrada",
    "Nenhuma consulta": "Ninguna consulta",
    "Nenhuma tabela encontrada": "Ninguna tabla encontrada",
    "Nome da Tabela": "Nombre de la Tabla",
    "Nome do Banco": "Nombre de la Base de Datos",
    "Offline": "Sin conexión",
    "Online": "En línea",
    "Porta": "Puerto",
    "Processos Ativos": "Procesos Activos",
    "SQL": "SQL",
    "Status": "Estado",
    "Tabelas do Banco de Dados": "Tablas de la Base de Datos",
    "Tamanho Total": "Tamaño Total",
    "Tamanho de Dados": "Tamaño de Datos",
    "Tamanho de Índices": "Tamaño de Índices",
    "Tempo (s)": "Tiempo (s)",
    "Tempo de Atividade": "Tiempo de Actividad",
    "Tempo de Consulta": "Tiempo de Consulta",
    "Total de Conexões": "Total de Conexiones",
    "Total de Consultas": "Total de Consultas",
    "Usuário": "Usuario",
    forgotPassword: {
      title: "¿Olvidaste tu contraseña?",
      form: {
        email: "Ingresa tu correo electrónico"
      },
      buttons: {
        submit: "Enviar enlace de restablecimiento",
        backToLogin: "Volver al inicio de sesión"
      },
      success: "Si se encontró un correo electrónico válido, se envió un enlace para restablecer la contraseña!",
      error: "Error al solicitar el restablecimiento de contraseña. Intente nuevamente más tarde."
    },
    integrations: {
      success: "Integración guardada con éxito.",
      title: "Integraciones",
      integrations: {
        openai: {
          title: "OpenAI",
          organization: "ID de Organización",
          apikey: "KEY"
        },
        n8n: {
          title: "N8N",
          urlApiN8N: "URL API N8N"
        },
        maps: {
          title: "Api Google Maps",
          apiMaps: "Api Key"
        }
      }
    },
    languageSelector: {
      title: "Seleccione el idioma"
    },
    locationPreview: {
      title: "Ubicación recibida",
      alt: "Ubicación",
      latitude: "Latitud",
      longitude: "Longitud",
      buttons: {
        view: "VER"
      },
      noCoordinates: "Coordenadas no disponibles"
    },
    multiVcardPreview: {
      title: "Contactos recibidos",
      viewAll: "Ver todos los {{count}} contactos"
    },
    vcardPreview: {
      chat: "CONVERSAR",
      mobile: "Celular",
      number: "Número",
      contactName: "Nombre del contacto",
      numberNotAvailable: "Número no disponible",
      selectNumberTitle: "Seleccione un número para conversar",
      whatsappNumber: "Número con WhatsApp",
      phoneNumber: "Número de teléfono",
      cancel: "Cancelar"
    },
    login: {
      title: "Inicia sesión ahora",
      form: {
        email: "Ingresa el correo electrónico",
        password: "Ingresa tu contraseña"
      },
      buttons: {
        forgotPassword: "¿Olvidaste tu contraseña?",
        submit: "Iniciar sesión",
        register: "¿No tienes cuenta? ¡Regístrate!"
      }
    },
    mainDrawer: {
      listItems: {
        general: "General",
        administration: "Administración",
        apititle: "API",
        videos: "Videos informativos",
        api: "Uso de la API",
        apidocs: "Documentación",
        apikey: "Clave API",
        tickets: "Tickets",
        contacts: "Contactos",
        blockedContacts: "Contactos bloqueados",
        dashboard: "Dashboard",
        quickAnswers: "Respuestas Rápidas",
        tags: "Etiquetas",
        clientStatus: "Estado de clientes",
        channels: "Canales",
        queues: "Sectores",
        users: "Agentes",
        groups: "Grupos",
        settings: "Configuraciones",
        system: "Monitoreo del sistema",
        errorLogs: "Log de errores",
        diskSpace: "Espacio en disco",
        maintenance: "Mantenimiento del sistema",
        memoryUsage: "Uso de memoria RAM",
        cpuUsage: "Uso de CPU",
        databaseStatus: "Base de datos",
        backup: "Backup y restauración DB",
        activityLogs: "Logs de actividad",
        networkStatus: "Estado de la red",
        queueMonitor: "Monitoreo de sectores",
        userMonitor: "Monitoreo de usuarios",
        systemHealth: "Monitoreo de canales",
        systemUpdate: "Actualizaciones del sistema",
        versionCheck: "Verificación de la librería",
        logout: "Salir",
        connections: "Canales",
        token: "Token"
      },
      appBar: {
        message: {
          hi: "Hola",
          text: "Bienvenido al sistema."
        },
        user: {
          profile: "Perfil",
          logout: "Cerrar sesión"
        },
        fullscreen: {
          enter: "Pantalla completa",
          exit: "Salir de pantalla completa"
        }
      }
    },
    messageOptionsMenu: {
      react: "Reaccionar (beta)",
      edit: "Editar",
      history: "Historial",
      delete: "Eliminar",
      reply: "Responder",
      copy: "Copiar",
      forward: "Reenviar (beta)",
      copied: "¡Mensaje copiado!",
      copyError: "Error al copiar el mensaje",
      confirmationModal: {
        title: "¿Borrar mensaje?",
        message: "Esta acción no se puede deshacer."
      }
    },
    forwardMessages: {
      title: "Reenviar mensajes a",
      searchPlaceholder: "Buscar nombre o número",
      selectedCount: "seleccionada",
      selectedCountPlural: "seleccionadas",
      forwardButton: "Reenviar",
      cancel: "Cancelar",
      selectMode: "Seleccionar mensajes",
      exitSelectMode: "Salir",
      noMessagesSelected: "Ningún mensaje seleccionado",
      forwarded: "Reenviado",
      forwardedSuccess: "¡Mensajes reenviados con éxito!",
      forwardedError: "Error al reenviar los mensajes"
    },
    healthCheck: {
      title: "Monitoreo de canales",
      tooltips: {
        refresh: "Actualizar"
      },
      noChannels: "No se encontraron canales",
      number: "Número",
      pushname: "Usuario",
      platform: "Plataforma",
      wwebVersion: "Versión",
      uptime: "Uptime",
      messages: "Mensajes",
      latency: "Latencia",
      errors: "Errores",
      lastActivity: "Última actividad",
      connectionStatus: "Estado de la conexión"
    },
    messageHistoryModal: {
      close: "Cerrar",
      title: "Historial de edición del mensaje"
    },
    messagesList: {
      header: {
        assignedTo: "Responsable:",
        queue: "Sector",
        channel: "Canal",
        noAssignedUser: "Ninguno",
        noChannel: "Ninguno",
        noQueue: "Ninguno",
        buttons: {
          return: "Regresar",
          resolve: "Finalizar",
          reopen: "Reabrir",
          accept: "Aceptar",
          options: "Opciones"
        }
      },
      message: {
        notCompatibleWithSystem: "Recibió un mensaje que actualmente no es compatible con el sistema.",
        viewOnMobile: "Para ver el contenido completo, acceda a la aplicación en el celular.",
        type: "Tipo de mensaje",
        download: "Descargar",
        ticketNumber: "#ticket:",
        voiceVideoLost: "Mensaje de voz o video perdido a las",
        deleted: "Mensaje eliminado",
        edited: "Editado",
        today: "Hoy",
        yesterday: "Ayer"
      }
    },
    messagesInput: {
      placeholderOpen: "Escribe un mensaje",
      placeholderClosed: "Reabre o acepta este ticket para enviar un mensaje.",
      placeholderBlocked: "El contacto está bloqueado. Desbloquéelo para enviar mensajes.",
      signMessage: "Firmar",
      btnSend: "Enviar",
      btnUploadFile: "Enviar medio",
      btnRecord: "Grabar audio",
      tooManyFiles: "Se excedió el número máximo de archivos. Máx: ",
      dropFilesHere: "Arrastre archivos aquí",
      buttons: {
        emoji: "Agregar emoji",
        attach: "Adjuntar archivo",
        record: "Grabar audio",
        send: "Enviar mensaje"
      },
      clearReply: "Limpiar respuesta"
    },
    attachmentMenu: {
      document: "Documento",
      documentDesc: "PDF, DOC, TXT y otros",
      photoVideo: "Fotos y videos",
      photoVideoDesc: "Imágenes y videos de la galería",
      camera: "Cámara (beta)",
      cameraDesc: "Tomar foto o grabar video",
      audio: "Audio",
      audioDesc: "Archivos de audio MP3, WAV y otros",
      contact: "Contacto (beta)",
      contactDesc: "Compartir contacto"
    },
    messageVariablesPicker: {
      label: "Variables disponibles",
      vars: {
        contactName: "Nombre",
        user: "Agente",
        greeting: "Saludo",
        protocolNumber: "Protocolo",
        date: "Fecha",
        hour: "Hora",
        ticket_id: "ID del Ticket",
        queue: "Sector",
        connection: "Canal"
      }
    },
    modalImageContact: {
      alt: "Imagen del contacto",
      toolBar: {
        rotateLeft: "Rotar a la izquierda",
        rotateRight: "Rotar a la derecha",
        zoomIn: "Acercar",
        zoomOut: "Alejar",
        resetZoom: "Restablecer zoom",
        fullscreen: "Pantalla completa",
        fullscreenExit: "Salir de pantalla completa",
        copyLink: "Copiar enlace",
        download: "Descargar imagen"
      },
      snackbar: {
        copyLinkSuccess: "¡Enlace copiado con éxito!",
        copyLinkError: "Error al copiar el enlace. Intente nuevamente."
      }
    },
    modalImageCors: {
      alt: "Imagen del contacto",
      error: {
        loadImage: "Error al cargar la imagen"
      },
      navigation: {
        previous: "Imagen anterior",
        next: "Imagen siguiente"
      },
      button: {
        applyCrop: "Aplicar",
        cancelCrop: "Cancelar"
      },
      dragToCrop: "Arrastre para seleccionar el área de recorte",
      toolBar: {
        rotateLeft: "Rotar a la izquierda",
        rotateRight: "Rotar a la derecha",
        zoomIn: "Acercar",
        zoomOut: "Alejar",
        resetZoom: "Restablecer zoom",
        fullscreen: "Pantalla completa",
        exitFullscreen: "Salir de pantalla completa",
        copyLink: "Copiar enlace",
        download: "Descargar imagen",
        cancelCrop: "Cancelar recorte",
        cropImage: "Recortar imagen",
        disableCompare: "Desactivar comparación",
        compareImages: "Comparar imágenes",
        downloadImage: "Descargar imagen"
      },
      snackbar: {
        copyLinkSuccess: "¡Enlace copiado con éxito!",
        copyLinkError: "Error al copiar el enlace. Intente nuevamente.",
        cropSuccess: "¡Imagen recortada con éxito!",
        cropError: "Error al recortar la imagen. Intente nuevamente."
      }
    },
    newTicketModal: {
      title: "Crear Ticket",
      fieldLabel: "Escribe para buscar el contacto",
      add: "Agregar",
      select: {
        none: "Seleccionar",
        queue: "Seleccionar Sector",
        channel: "Seleccionar Canal"
      },
      buttons: {
        ok: "Guardar",
        cancel: "Cancelar"
      }
    },
    newTicketModalContactPage: {
      title: "Crear Ticket",
      queue: "Seleccionar un Sector",
      fieldLabel: "Escribe para buscar el contacto",
      add: "Agregar",
      buttons: {
        ok: "Guardar",
        cancel: "Cancelar"
      }
    },
    notifications: {
      allow: "¿Permitir notificaciones en el navegador?",
      noTickets: "Sin notificaciones.",
      permissionGranted: "Permiso concedido.",
      permissionDenied: "Permiso denegado."
    },
    qrCode: {
      message: "Escanea el código QR para iniciar sesión"
    },
    queueModal: {
      title: {
        add: "Agregar Sector",
        edit: "Editar Sector"
      },
      notification: {
        title: "¡Sector guardado con éxito!"
      },
      validation: {
        tooShort: "Muy corto",
        tooLong: "Muy largo",
        requiredName: "El nombre del sector es obligatorio",
        requiredColor: "El color del sector es obligatorio"
      },
      form: {
        name: "Nombre",
        namePlaceholder: "Escriba el nombre del sector",
        color: "Color",
        colorTooltip: "Color actual del sector",
        selectColor: "Seleccionar color",
        greetingMessage: "Mensaje de saludo",
        greetingMessagePlaceholder: "Escriba el mensaje que se enviará cuando el cliente sea atendido en este sector",
        startWork: "Apertura",
        endWork: "Cierre",
        absenceMessage: "Mensaje de ausencia",
        absenceMessagePlaceholder: "Escriba el mensaje que se enviará cuando el sector esté cerrado",
        breakTitle: "Horario de descanso",
        startBreak: "Inicio del descanso",
        endBreak: "Fin del descanso",
        breakMessage: "Mensaje de descanso",
        breakMessagePlaceholder: "Escriba el mensaje que se enviará cuando el sector esté en descanso"
      },
      buttons: {
        okAdd: "Agregar",
        okEdit: "Guardar",
        cancel: "Cancelar"
      }
    },
    queues: {
      title: "Sectores",
      notifications: {
        queueDeleted: "El sector fue eliminado."
      },
      table: {
        id: "ID",
        name: "Nombre",
        color: "Color",
        greeting: "Mensaje de saludo",
        workHours: "Horarios",
        actions: "Acciones",
        startWork: "Apertura",
        endWork: "Cierre",
        edit: "Editar",
        delete: "Eliminar"
      },
      buttons: {
        add: "Agregar sector"
      },
      confirmationModal: {
        deleteTitle: "Eliminar",
        deleteMessage: "¿Estás seguro? ¡Esta acción no se puede deshacer! Los tickets de este sector seguirán existiendo, pero no tendrán ningún sector asignado."
      },
      messagesModal: {
        title: "Mensajes",
        greetingMessage: "Mensaje de saludo",
        absenceMessage: "Mensaje de ausencia",
        none: "Ningún mensaje",
        btnClose: "Cerrar"
      },
      timeModal: {
        title: "Horarios de trabajo",
        notSet: "No definido",
        btnClose: "Cerrar"
      }
    },
    queueSelect: {
      inputLabel: "Sectores"
    },
    quickAnswers: {
      title: "Respuestas Rápidas",
      table: {
        shortcut: "Atajo",
        message: "Respuesta Rápida",
        actions: "Acciones"
      },
      buttons: {
        add: "Agregar Respuesta Rápida",
        deleteAll: "Eliminar Todas las Respuestas Rápidas"
      },
      toasts: {
        deleted: "Respuesta Rápida eliminada con éxito.",
        deletedAll: "Todas las Respuestas Rápidas eliminadas."
      },
      searchPlaceholder: "Buscar...",
      confirmationModal: {
        deleteTitle: "¿Estás seguro de que deseas eliminar esta Respuesta Rápida: ",
        deleteAllTitle: "¿Estás seguro de que deseas eliminar todas las Respuestas Rápidas?",
        deleteMessage: "Esta acción no se puede deshacer.",
        deleteAllMessage: "Esta acción no se puede deshacer."
      }
    },
    quickAnswersModal: {
      title: {
        add: "Agregar Respuesta Rápida",
        edit: "Editar Respuesta Rápida"
      },
      form: {
        shortcut: "Atajo",
        message: "Respuesta Rápida"
      },
      variables: "Variables disponibles",
      buttons: {
        okAdd: "Agregar",
        okEdit: "Guardar",
        cancel: "Cancelar"
      },
      success: "Respuesta Rápida guardada con éxito."
    },
    resetPassword: {
      title: "Restablecer Contraseña",
      form: {
        password: "Nueva Contraseña",
        confirmPassword: "Confirmar Nueva Contraseña"
      },
      buttons: {
        submit: "Restablecer Contraseña",
        backToLogin: "Volver al Inicio de Sesión"
      },
      success: "¡Contraseña restablecida con éxito!",
      error: {
        passwordMismatch: "Las contraseñas no coinciden.",
        generic: "Error al restablecer la contraseña. Inténtalo de nuevo."
      }
    },
    settings: {
      title: "Configuraciones",
      success: "Configuraciones guardadas con éxito.",
      tabs: {
        general: "Generales",
        personalize: "Personalizar",
        integrations: "Integraciones",
        company: "Empresa"
      },
      general: {
        ticketManagement: "Gestión de tickets",
        userInterface: "Interfaz del usuario",
        systemBehavior: "Comportamiento del sistema",
        timeSettings: "Configuraciones de tiempo",
        userCreation: {
          name: "Creación de agente",
          note: "Permitir la creación de agente",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        allTicket: {
          name: "Todos pueden ver el ticket sin sector",
          note: "Activa esta función para que todos los usuarios puedan ver los tickets sin sector",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        CheckMsgIsGroup: {
          name: "Ignorar Mensajes de Grupos",
          note: "Si se desactiva, recibirás mensajes de los grupos.",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        call: {
          name: "Aceptar llamadas",
          note: "Si se desactiva, el cliente recibirá un mensaje informando que no se aceptan llamadas de voz/vídeo",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        autoRejectCalls: {
          name: "Rechazar llamadas automáticamente (beta)",
          note: "Rechaza automáticamente todas las llamadas recibidas (voz y video) y envía un mensaje configurable",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        autoRejectCallsMessage: {
          name: "Mensaje de rechazo de llamadas",
          note: "Mensaje enviado automáticamente después de rechazar una llamada",
          placeholder: "Escriba el mensaje que se enviará cuando se rechace una llamada..."
        },
        callSettings: "Configuraciones de llamadas",
        sideMenu: {
          name: "Menú Lateral Inicial",
          note: "Si está habilitado, el menú lateral comenzará cerrado",
          options: {
            enabled: "Abierto",
            disabled: "Cerrado"
          }
        },
        quickAnswer: {
          name: "Respuestas Rápidas",
          note: "Si está habilitado, podrás editar las respuestas rápidas",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        closeTicketApi: {
          name: "Cerrar Ticket enviado por API",
          note: "Cierra automáticamente el ticket cuando se envía por API",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        darkMode: {
          name: "Activar Modo Oscuro",
          note: "Alternar entre el modo claro y el modo oscuro",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        ASC: {
          name: "Ordenación de los Tickets (ASC o DESC)",
          note: "Al activar, ordenará ascendente (ASC); al desactivar, ordenará descendente (DESC)",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        created: {
          name: "Ordenación de los Tickets (createdAt o updateAt)",
          note: "Al activar, ordenará por la fecha de creación (createdAt); al desactivar, ordenará por la fecha de actualización (updateAt)",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        openTickets: {
          name: "Impedir múltiples tickets para el mismo contacto",
          note: "Al activar, se impedirá abrir tickets para contactos que ya tengan un ticket abierto",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        signOption: {
          name: "Suscribirse Mensaje",
          note: "Active esta función para permitir que el usuario pueda desactivar la firma de mensajes",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        tabsPending: {
          name: "Mostrar tabs de pendientes",
          note: "Si se desactiva, no se mostrará la pestaña de pendientes",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        tabsClosed: {
          name: "Mostrar tabs de finalizados",
          note: "Si se desactiva, no se mostrará la pestaña de finalizados",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        listItemSpy: {
          name: "Mostrar botón Peek",
          note: "Si está habilitado, se mostrará el botón Peek en la lista de tickets",
          options: {
            enabled: "Ativado",
            disabled: "Desactivado"
          }
        },
        queueLength: {
          name: "Permitir enviar saludo del canal con 1 sector",
          note: "Si está habilitado, permitirá enviar el mensaje de saludo del canal solo con 1 sector",
          options: {
            enabled: "Activado",
            disabled: "Desactivado"
          }
        },
        timeCreateNewTicket: {
          name: "Nuevo Ticket en:",
          note: "Selecciona el tiempo necesario para abrir un nuevo ticket si el cliente se pone en contacto nuevamente",
          options: {
            10: "10 Segundos",
            30: "30 Segundos",
            60: "1 minuto",
            300: "5 minutos",
            1800: "30 minutos",
            3600: "1 hora",
            7200: "2 horas",
            21600: "6 horas",
            43200: "12 horas",
            86400: "24 horas",
            604800: "7 días",
            1296000: "15 días",
            2592000: "30 días"
          }
        }
      },
      personalize: {
        success: {
          company: "¡Datos de la empresa guardados con éxito!",
          logos: "¡Logos guardados con éxito!",
          colors: "¡Colores guardados con éxito!"
        },
        error: {
          invalid: "Error al buscar personalizaciones.",
          company: "Error al guardar datos de la empresa.",
          logos: "Error al guardar el logo.",
          logs: "Error al guardar la personalización:",
          colors: "Error al guardar colores del tema: "
        },
        tabs: {
          company: "Empresa",
          logos: "Logos",
          colors: "Colores",
          data: "Datos"
        },
        tabpanel: {
          companyInfo: "Información de la empresa",
          company: "Empresa",
          url: "URL",
          light: "Tema Claro",
          dark: "Tema Oscuro",
          input: {
            primary: "Color Primario",
            secondary: "Color Secundario",
            default: "Fondo Predeterminado",
            paper: "Fondo de Papel"
          },
          button: {
            save: "Guardar",
            saveLight: "Guardar tema claro",
            saveDark: "Guardar tema oscuro"
          }
        }
      }
    },
    signup: {
      title: "Regístrate",
      toasts: {
        success: "Agente creado con éxito! Inicia sesión ahora!",
        fail: "Error al crear el agente. Verifique los datos ingresados."
      },
      form: {
        name: "Nombre",
        email: "Correo electrónico",
        password: "Contraseña"
      },
      buttons: {
        submit: "Registrar",
        login: "¿Ya tienes una cuenta? ¡Inicia sesión!"
      }
    },
    tags: {
      title: "Etiquetas",
      table: {
        id: "ID",
        name: "Etiquetas",
        color: "Color",
        contacts: "Contactos",
        actions: "Acción"
      },
      toasts: {
        deleted: "Etiqueta eliminada con éxito!",
        deletedAll: "Todas las etiquetas eliminadas con éxito!"
      },
      buttons: {
        add: "Agregar",
        deleteAll: "Eliminar todas",
        viewContacts: "Ver contactos con esta etiqueta"
      },
      confirmationModal: {
        deleteTitle: "Eliminar ",
        deleteAllTitle: "Eliminar todas",
        deleteMessage: "¿Estás seguro de que deseas eliminar esta etiqueta?",
        deleteAllMessage: "¿Estás seguro de que deseas eliminar todas las etiquetas?"
      }
    },
    tagModal: {
      title: {
        add: "Agregar etiqueta",
        edit: "Editar etiqueta"
      },
      buttons: {
        okAdd: "Guardar",
        okEdit: "Editar",
        cancel: "Cancelar"
      },
      form: {
        name: "Nombre de la etiqueta",
        color: "Color de la etiqueta"
      },
      success: "Etiqueta guardada con éxito!"
    },
    clientStatus: {
      title: "Estado de clientes",
      table: {
        id: "ID",
        name: "Estado",
        color: "Color",
        contacts: "Contactos",
        actions: "Acción"
      },
      toasts: {
        deleted: "¡Estado eliminado con éxito!",
        deletedAll: "¡Todos los estados eliminados con éxito!"
      },
      buttons: {
        add: "Agregar",
        deleteAll: "Eliminar todos",
        viewContacts: "Ver contactos con este estado"
      },
      confirmationModal: {
        deleteTitle: "Eliminar ",
        deleteAllTitle: "Eliminar todos",
        deleteMessage: "¿Está seguro de que desea eliminar este estado?",
        deleteAllMessage: "¿Está seguro de que desea eliminar todos los estados?"
      }
    },
    clientStatusModal: {
      title: {
        add: "Agregar estado",
        edit: "Editar estado"
      },
      buttons: {
        okAdd: "Guardar",
        okEdit: "Editar",
        cancel: "Cancelar"
      },
      form: {
        name: "Nombre del estado",
        color: "Color del estado"
      },
      success: "¡Estado guardado con éxito!"
    },
    ticketsManager: {
      buttons: {
        newTicket: "Nuevo",
        closed: "Finalizar",
        refresh: "Actualizar"
      },
      menu: {
        all: "Todos los tickets",
        open: "Todos en atención",
        pending: "Todos en espera",
        groups: "Todos los grupos"
      },
      confirmationModal: {
        closeAllTitle: "Finalizar todos los tickets",
        closeOpenTitle: "Finalizar tickets en atención",
        closePendingTitle: "Finalizar tickets en espera",
        closeGroupsTitle: "Finalizar todos los grupos",
        closeAllMessage: "¿Está seguro de que desea finalizar todos los tickets?",
        closeOpenMessage: "¿Está seguro de que desea finalizar todos los tickets en atención (individuales)?",
        closePendingMessage: "¿Está seguro de que desea finalizar todos los tickets en espera?",
        closeGroupsMessage: "¿Está seguro de que desea finalizar todos los grupos en atención?"
      }
    },
    ticketsQueueSelect: {
      placeholder: "Sectores"
    },
    tickets: {
      toasts: {
        deleted: "El ticket en el que estabas fue eliminado."
      },
      notification: {
        message: "Mensaje de"
      },
      notifications: {
        closed: {
          success: "¡Tickets finalizados con éxito!",
          error: "Error al finalizar los tickets. Intente nuevamente.",
          tickets: "tickets finalizados"
        }
      },
      tabs: {
        open: {
          title: "Bandeja de entrada"
        },
        groups: {
          title: "Grupos"
        },
        pending: {
          title: "En espera"
        },
        closed: {
          title: "Finalizados"
        },
        search: {
          title: "Buscar"
        }
      },
      search: {
        placeholder: "Buscar tickets y mensajes"
      },
      buttons: {
        showAll: "Todos",
        queues: "Sectores"
      },
      confirmationModal: {
        closeTicket: {
          title: "Cerrar Ticket",
          message: "¿Está seguro de que desea cerrar este ticket?"
        }
      }
    },
    transferTicketModal: {
      title: "Transferir ticket",
      fieldLabel: "Escribe para buscar un agente",
      fieldConnectionLabel: "Seleccionar canal",
      fieldQueueLabel: "Transferir al sector",
      fieldConnectionPlaceholder: "Selecciona un canal",
      noOptions: "No se encontró ningún agente con ese nombre",
      buttons: {
        ok: "Transferir",
        cancel: "Cancelar"
      }
    },
    ticketsList: {
      pendingHeader: "En espera",
      assignedHeader: "Atendiendo",
      noTicketsTitle: "¡Nada aquí!",
      noTicketsMessage: "No se encontraron tickets con este estado o término buscado",
      connectionTitle: "Canal que está siendo utilizado actualmente.",
      items: {
        queueless: "Sin sector",
        accept: "Aceptar",
        spy: "Espiar",
        close: "Cerrar",
        reopen: "Reabrir",
        return: "Mover a en espera",
        connection: "Canal",
        user: "Agente",
        queue: "Sector",
        tags: "Etiquetas",
        ticket: "Ticket ID"
      },
      buttons: {
        accept: "Responder",
        acceptBeforeBot: "Aceptar",
        start: "Iniciar",
        cancel: "Cancelar"
      },
      acceptModal: {
        title: "Aceptar chat",
        queue: "Seleccionar sector",
        selectQueue: "Seleccione un sector"
      },
      errors: {
        ticketAlreadyOpen: "Ya existe un ticket abierto para este contacto, asignado al Agente: *{{userName}}* en el Canal: *{{userChannel}}* creado en: *{{ticketCreatedAt}}*."
      }
    },
    ticketOptionsMenu: {
      delete: "Eliminar",
      transfer: "Transferir",
      confirmationModal: {
        title: "Eliminar el ticket ",
        titleFrom: "del contacto ",
        message: "¡Atención! Todos los mensajes relacionados con el ticket se perderán."
      },
      buttons: {
        delete: "Eliminar",
        cancel: "Cancelar"
      }
    },
    uploads: {
      titles: {
        titleUploadMsgDragDrop: "⬇️ ARRASTRA Y SUELTA ARCHIVOS AQUÍ ⬇️",
        titleFileList: "Lista de archivo(s)"
      }
    },
    uploadModal: {
      title: "Enviar archivos",
      caption: "Leyenda",
      captionPlaceholder: "Agregue una leyenda (opcional)",
      send: "Enviar",
      cancel: "Cancelar",
      remove: "Quitar archivo",
      pdfError: "No fue posible cargar el PDF. Por favor, descargue el archivo."
    },
    users: {
      title: "Agentes",
      searchPlaceholder: "Buscar...",
      status: {
        online: "En línea",
        offline: "Fuera de línea"
      },
      table: {
        id: "ID",
        name: "Nombre",
        status: "Estado",
        email: "Correo electrónico",
        profile: "Perfil",
        whatsapp: "Canal",
        queue: "Sector",
        startWork: "Hora de inicio",
        endWork: "Hora de fin",
        schedule: "Horarios",
        actions: "Acciones",
        viewChannels: "Ver canales",
        viewQueues: "Ver sectores",
        viewSchedule: "Ver horarios"
      },
      schedule: {
        title: "Horarios de trabajo",
        opening: "Apertura",
        closing: "Cierre"
      },
      buttons: {
        add: "Agregar agente",
        close: "Cerrar"
      },
      modalTitle: {
        channel: "Canales",
        queue: "Sectores"
      },
      modalTable: {
        id: "ID",
        name: "Nombre",
        type: "Tipo"
      },
      toasts: {
        deleted: "Agente eliminado con éxito.",
        updated: "Agente actualizado con éxito."
      },
      confirmationModal: {
        deleteTitle: "Eliminar",
        deleteMessage: "Todos los datos de este agente se perderán. Los tickets abiertos por este agente se moverán a pendientes."
      },
      actions: {
        activate: "Activar usuario",
        deactivate: "Desactivar usuario",
        edit: "Editar",
        delete: "Eliminar"
      }
    },
    userModal: {
      title: {
        add: "Agregar agente",
        edit: "Editar agente"
      },
      form: {
        name: "Nombre",
        namePlaceholder: "Escriba el nombre del agente",
        email: "Correo electrónico",
        emailPlaceholder: "Escriba el e-mail del agente",
        password: "Contraseña",
        passwordPlaceholder: "Escriba la contraseña del agente",
        toggleVisibility: "Mostrar/ocultar contraseña",
        profile: "Perfil",
        admin: "Administrador",
        user: "Agente",
        startWork: "Inicio",
        endWork: "Fin",
        isTricked: "Ver contactos",
        enabled: "Habilitado",
        disabled: "Deshabilitado"
      },
      buttons: {
        okAdd: "Agregar",
        okEdit: "Guardar",
        cancel: "Cancelar"
      },
      success: "Agente guardado con éxito."
    },
    whatsappModal: {
      title: {
        add: "Agregar WhatsApp",
        edit: "Editar WhatsApp"
      },
      form: {
        name: "Nombre",
        namePlaceholder: "Escriba el nombre de la conexión",
        default: "Predeterminado",
        display: "Mostrar horarios de sectores",
        farewellMessage: "Mensaje de despedida",
        farewellMessagePlaceholder: "Este mensaje se enviará antes de cerrar la atención",
        greetingMessagePlaceholder: "Este mensaje se enviará cuando el cliente inicie la conversación",
        color: "Color",
        channels: "Activar canales",
        mainInfo: "Información principal",
        messagesTitle: "Mensajes",
        appearanceTitle: "Apariencia",
        queuesTitle: "Sectores",
        channelSelection: "Selección de canal",
        selectChannel: "Seleccionar canal",
        selectChannelPlaceholder: "Seleccione un canal",
        channelType: "Tipo de canal",
        typeWhatsapp: "WhatsApp",
        typeTelegram: "Telegram (bot)",
        tokenTelegram: "Token del bot de Telegram",
        tokenTelegramHelp: "Creá un bot con @BotFather y pegá acá el token que te da."
      },
      buttons: {
        okAdd: "Agregar",
        okEdit: "Guardar",
        cancel: "Cancelar"
      },
      success: "WhatsApp guardado con éxito."
    },
    whatsappSelect: {
      inputLabel: "Canales"
    },
    databaseStatus: {
      title: "Monitoreo de la base de datos",
      refresh: "Actualizar",
      fetchError: "Error al cargar los datos de la base de datos",
      generalInfo: "Información general",
      dbName: "Nombre de la base",
      status: "Estado",
      online: "En línea",
      offline: "Fuera de línea",
      host: "Host",
      port: "Puerto",
      dialect: "Dialecto",
      totalSize: "Tamaño total",
      performance: "Rendimiento",
      uptime: "Tiempo de actividad",
      activeConnections: "Conexiones activas",
      totalConnections: "Total de conexiones",
      totalQueries: "Total de consultas",
      slowQueries: "Consultas lentas",
      dbTables: "Tablas de la base de datos",
      tableName: "Nombre de la tabla",
      rows: "Filas",
      dataSize: "Tamaño de datos",
      indexSize: "Tamaño de índices",
      noTables: "No se encontraron tablas",
      slowQueriesTitle: "Consultas lentas (últimas 24 h)",
      startTime: "Hora de inicio",
      database: "Base",
      queryTime: "Tiempo de consulta",
      rowsExamined: "Filas examinadas",
      sql: "SQL",
      noSlowQueries: "No se encontraron consultas lentas",
      activeProcesses: "Procesos activos",
      id: "ID",
      user: "Usuario",
      command: "Comando",
      time: "Tiempo (s)",
      state: "Estado",
      query: "Consulta",
      noQuery: "Sin consulta",
      noActiveProcesses: "No se encontraron procesos activos"
    },
    videos: {
      title: "Videos informativos",
      searchPlaceholder: "Buscar por título...",
      loading: "Cargando videos...",
      noRecords: "No se encontraron videos.",
      table: {
        title: "Título",
        status: "Estado",
        visibility: "Visibilidad",
        actions: "Acciones"
      },
      active: "Activo",
      inactive: "Inactivo",
      allUsers: "Todos los usuarios",
      buttons: {
        add: "Agregar video",
        edit: "Editar",
        delete: "Eliminar",
        cards: "Ver cards",
        table: "Ver tabla",
        save: "Guardar",
        cancel: "Cancelar"
      },
      dialog: {
        add: "Agregar video",
        edit: "Editar video",
        title: "Título",
        url: "URL de YouTube",
        urlHelp: "Ingrese la URL completa del video de YouTube",
        active: "Activo",
        users: "Usuarios que pueden ver",
        usersHelp: "Si no se selecciona ningún usuario, todos podrán ver el video",
        preview: "Vista previa"
      },
      toasts: {
        added: "¡Video agregado con éxito!",
        updated: "¡Video actualizado con éxito!",
        deleted: "¡Video eliminado con éxito!",
        required: "Por favor, complete todos los campos obligatorios.",
        invalidUrl: "¡URL de video inválida!"
      },
      confirmationModal: {
        deleteTitle: "Eliminar video",
        deleteMessage: "¿Está seguro de que desea eliminar este video? Esta acción no se puede deshacer."
      }
    },
    systemHealth: {
      title: "Panel de salud del sistema",
      refresh: "Actualizar",
      refreshSuccess: "¡Datos actualizados con éxito!",
      overallStatus: "Estado general del sistema",
      statusHealthy: "Saludable",
      statusWarning: "Atención",
      statusCritical: "Crítico",
      statusLoading: "Cargando...",
      uptime: "Tiempo activo",
      activeUsers: "Usuarios activos",
      openTickets: "Tickets abiertos",
      messagesLast24h: "Mensajes (24 h)",
      alerts: "Alertas",
      cpu: "CPU",
      memory: "Memoria",
      disk: "Disco",
      database: "Base de datos",
      whatsapp: "WhatsApp",
      application: "Aplicación",
      usage: "Uso",
      cores: "Núcleos",
      model: "Modelo",
      loadAvg: "Carga media",
      total: "Total",
      used: "Usado",
      free: "Libre",
      status: "Estado",
      connected: "Conectado",
      error: "Error",
      responseTime: "Tiempo de respuesta",
      activeConnections: "Conexiones activas",
      version: "Versión",
      totalConnections: "Total de conexiones",
      connectedWhatsapps: "WhatsApps conectados",
      disconnectedWhatsapps: "WhatsApps desconectados",
      pendingMessages: "Mensajes pendientes",
      nodeVersion: "Versión de Node.js",
      pendingTickets: "Tickets pendientes",
      errors: "Errores",
      checkConnections: "Verificar conexiones",
      databaseStatus: "Estado de la base de datos",
      connectedSessions: "Sesiones conectadas",
      disconnectedSessions: "Sesiones desconectadas",
      whatsappConnections: "Conexiones de WhatsApp",
      databaseResponseTime: "Tiempo de respuesta de la base",
      databaseConnections: "Conexiones a la base de datos",
      whatsappStatus: "Estado de las conexiones WhatsApp",
      applicationStatus: "Estado de la aplicación",
      systemStatus: "Estado del sistema",
      healthySystem: "Sistema saludable",
      warningSystem: "Sistema con alertas",
      criticalSystem: "Sistema en estado crítico"
    },
    queueMonitor: {
      title: "Monitoreo de sector",
      refresh: "Actualizar",
      refreshSuccess: "¡Datos actualizados con éxito!",
      summary: "Resumen",
      totalTickets: "Total de tickets",
      waitingTickets: "Tickets en espera",
      avgWaitTime: "Tiempo medio de espera",
      messagesLast24Hours: "Mensajes (24 h)",
      whatsappConnections: "Canales",
      name: "Nombre",
      type: "Tipo",
      status: "Estado",
      queues: "Sectores",
      pendingMessages: "Mensajes pendientes",
      users: "Usuarios",
      pendingTickets: "Tickets pendientes",
      activeTickets: "Tickets activos",
      avgHandleTime: "Tiempo medio de atención",
      oldestTicket: "Ticket más antiguo",
      totalMessages: "Total de mensajes",
      last24Hours: "Últimas 24 horas",
      last7Days: "Últimos 7 días",
      today: "Hoy",
      connected: "Conectado",
      disconnected: "Desconectado",
      loading: "Cargando...",
      justNow: "Ahora mismo",
      minutesAgo: "hace {{minutes}} minuto(s)",
      hoursAgo: "hace {{hours}} hora(s)",
      daysAgo: "hace {{days}} día(s)"
    },
    userMonitor: {
      title: "Monitoreo de usuarios",
      refresh: "Actualizar",
      refreshSuccess: "¡Datos actualizados con éxito!",
      selectUser: "Seleccionar usuario",
      allUsers: "Todos los usuarios",
      summary: "Resumen general",
      totalUsers: "Total de usuarios",
      usersOnline: "Usuarios en línea",
      usersOffline: "Usuarios fuera de línea",
      totalTickets: "Total de tickets",
      totalMessages: "Total de mensajes",
      avgResponseTime: "Tiempo medio de respuesta",
      avgResolutionRate: "Tasa media de resolución",
      user: "Usuario",
      profile: "Perfil",
      status: "Estado",
      online: "En línea",
      offline: "Fuera de línea",
      queues: "Sectores",
      tickets: "Tickets",
      messages: "Mensajes",
      resolutionRate: "Tasa de resolución",
      lastActivity: "Última actividad",
      detailedStats: "Estadísticas detalladas",
      ticketsByUser: "Tickets por usuario",
      messagesByUser: "Mensajes por usuario",
      performanceMetrics: "Métricas de rendimiento",
      userStatus: "Estado de los usuarios",
      open: "Abiertos",
      pending: "Pendientes",
      closed: "Cerrados",
      total: "Total",
      today: "Hoy",
      last7Days: "Últimos 7 días",
      responseTime: "Tiempo de respuesta",
      handleTime: "Tiempo de atención",
      justNow: "Ahora mismo",
      minutesAgo: "hace {{minutes}} minuto(s)",
      hoursAgo: "hace {{hours}} hora(s)",
      daysAgo: "hace {{days}} día(s)",
      profiles: {
        admin: "Administrador",
        user: "Usuario"
      }
    },
    networkStatus: {
      title: "Estado de la red",
      refresh: "Actualizar",
      fetchError: "Error al obtener los datos de la red",
      internetConnection: "Conexión a Internet",
      online: "En línea",
      offline: "Fuera de línea",
      latency: "Latencia",
      host: "Host",
      status: "Estado",
      avgLatency: "Latencia media",
      minLatency: "Latencia mínima",
      maxLatency: "Latencia máxima",
      dnsStatus: "Estado del DNS",
      dnsWorking: "Funcionando",
      dnsFailed: "Falló",
      resolveTime: "Tiempo de resolución",
      activeConnections: "Conexiones activas",
      total: "Total",
      established: "Establecidas",
      listening: "Escuchando",
      timeWait: "Tiempo de espera",
      closeWait: "Cierre pendiente",
      networkInterfaces: "Interfaces de red",
      noInterfaces: "No se encontraron interfaces de red",
      up: "Activa",
      down: "Inactiva",
      mac: "Dirección MAC",
      speed: "Velocidad",
      received: "Recibidos",
      sent: "Enviados",
      errors: "Errores",
      dropped: "Descartados",
      lastUpdated: "Última actualización"
    },
    activityLogs: {
      title: "Logs de actividad",
      filter: "Filtrar",
      refresh: "Actualizar",
      user: "Usuario",
      action: "Acción",
      description: "Descripción",
      entity: "Entidad",
      timestamp: "Fecha/Hora",
      details: "Detalles",
      viewDetails: "Ver detalles",
      noLogs: "No se encontraron logs de actividad",
      entityDetails: "Detalles de la entidad",
      filterTitle: "Filtrar logs",
      startDate: "Fecha inicial",
      endDate: "Fecha final",
      selectUser: "Seleccionar usuario",
      selectAction: "Seleccionar acción",
      apply: "Aplicar",
      clear: "Limpiar",
      cancel: "Cancelar",
      logDetails: "Detalles del log",
      basicInfo: "Información básica",
      ip: "IP",
      close: "Cerrar",
      allActions: "Todas las acciones",
      allUsers: "Todos los usuarios",
      applyFilters: "Aplicar filtros",
      clearFilters: "Limpiar filtros",
      detailsError: "Error al cargar los detalles",
      loadError: "Error al cargar los logs"
    },
    systemUpdate: {
      title: "Actualizaciones del sistema",
      checkUpdates: "Verificar actualizaciones",
      checkSuccess: "¡Verificación de actualizaciones completada con éxito!",
      updateStatus: "Estado de la actualización",
      versionInfo: "Información de la versión",
      currentVersion: "Versión actual",
      latestVersion: "Versión más reciente",
      updateAvailable: "Actualización disponible",
      systemUpdated: "Sistema actualizado",
      upToDate: "Actualizado",
      outdated: "Sistema desactualizado",
      updated: "Sistema actualizado",
      lastChecked: "Última verificación",
      releaseNotes: "Notas de la versión",
      installUpdate: "Instalar actualización",
      backups: "Backups",
      restore: "Restaurar",
      noBackups: "Ningún backup disponible",
      refreshBackups: "Actualizar lista de backups",
      confirmRestore: "Confirmar restauración",
      restoreWarning: "¿Está seguro de que desea restaurar este backup? Esta acción reemplazará todos los datos actuales del sistema y no se puede deshacer.",
      confirmUpdate: "Confirmar actualización",
      updateWarning: "¿Está seguro de que desea actualizar el sistema? Se recomienda hacer un backup antes de continuar.",
      cancel: "Cancelar",
      confirm: "Confirmar",
      checking: "Verificando actualizaciones...",
      downloading: "Descargando actualización...",
      installing: "Instalando actualización...",
      completed: "¡Actualización completada con éxito!",
      error: "Error en la actualización",
      updateStarted: "¡Proceso de actualización iniciado!",
      restoreStarted: "¡Proceso de restauración iniciado!",
      updateCompleted: "¡Actualización completada con éxito!",
      updateError: "Ocurrió un error durante la actualización."
    },
    versionCheck: {
      title: "Verificación de versión",
      checkUpdates: "Verificar actualizaciones",
      statusTitle: "Estado de la versión del sistema",
      currentVersion: "Su versión",
      latestVersion: "Última versión",
      upToDate: "Su versión está actualizada",
      upToDateTitle: "¡Felicitaciones! Sistema actualizado",
      upToDateMessage: "Su sistema tiene la versión más reciente disponible. Está aprovechando todos los recursos y correcciones de seguridad más recientes.",
      outdated: "Su versión está desactualizada",
      latestAvailable: "Versión más reciente disponible",
      updateAvailable: "Actualización disponible",
      updateMessage: "Hay una nueva versión del sistema disponible. Contacte al administrador del sistema para solicitar la actualización.",
      repositoryLink: "Repositorio del proyecto",
      repository: "GitHub",
      updateLink: "Actualizador automático",
      update: "Manual de actualización",
      success: "¡Información de versión actualizada con éxito!",
      whatsappLibTitle: "Versión de la librería WhatsApp Web JS",
      whatsappLibCurrentVersion: "Versión actual de la librería",
      whatsappLibLatestVersion: "Última versión disponible",
      whatsappLibUpToDate: "Librería actualizada",
      whatsappLibOutdated: "Librería desactualizada",
      whatsappLibLatestAvailable: "Versión más reciente disponible",
      whatsappLibRepository: "Ver en GitHub",
      whatsappLibUpToDateTitle: "Librería WhatsApp Web JS actualizada",
      whatsappLibUpToDateMessage: "Su librería WhatsApp Web JS tiene la versión más reciente disponible. Está aprovechando todos los recursos y correcciones de seguridad más recientes.",
      whatsappLibUpdateAvailable: "Actualización de la librería disponible",
      whatsappLibUpdateMessage: "Hay una nueva versión de la librería WhatsApp Web JS disponible."
    },
    backendErrors: {
      ERR_CREATING_MESSAGE: "Error al crear el mensaje en la base de datos.",
      ERR_CREATING_TICKET: "Error al crear el ticket en la base de datos.",
      ERR_CHAT_NOT_FOUND: "No se encontró el chat en la sesión de WhatsApp.",
      ERR_CONNECTION_CREATION_COUNT: "Límite de canales alcanzado, para cambiar contacte con soporte.",
      ERR_DELETE_WAPP_MSG: "No se pudo eliminar el mensaje de WhatsApp.",
      ERR_DUPLICATED_CONTACT: "Ya existe un contacto con este número.",
      ERR_EDITING_WAPP_MSG: "No se pudo editar el mensaje de WhatsApp.",
      ERR_FETCH_WAPP_MSG: "Error al obtener el mensaje en WhatsApp, puede que sea muy antiguo.",
      ERR_INVALID_CREDENTIALS: "Error de autenticación. Por favor, inténtelo nuevamente.",
      ERR_MSG_NOT_DELETABLE: "No se pudo borrar el mensaje para todos. Solo se pueden borrar mensajes enviados desde este sistema y dentro del período que permite WhatsApp (aprox. 48 h).",
      ERR_MSG_NOT_EDITABLE: "No se pudo editar el mensaje en WhatsApp. Solo se pueden editar mensajes enviados desde este sistema y dentro de los últimos 15 minutos.",
      ERR_NO_CONTACT_FOUND: "No se encontró ningún contacto con este ID.",
      ERR_NO_DEF_WAPP_FOUND: "No se encontró un WhatsApp predeterminado. Verifique la página de canales.",
      ERR_NO_INTEGRATION_FOUND: "Integración no encontrada.",
      ERR_NO_PERMISSION: "No tiene permiso para acceder a este recurso.",
      ERR_NO_SETTING_FOUND: "No se encontró ninguna configuración con este ID.",
      ERR_NO_TAG_FOUND: "Etiqueta no encontrada.",
      ERR_NO_TICKET_FOUND: "No se encontró ningún ticket con este ID.",
      ERR_NO_USER_FOUND: "No se encontró ningún agente con este ID.",
      ERR_NO_WAPP_FOUND: "No se encontró ningún WhatsApp con este ID.",
      ERR_NO_OTHER_WHATSAPP: "Debe haber al menos un WhatsApp predeterminado.",
      ERR_OUT_OF_HOURS: "Fuera del horario laboral!",
      ERR_OPEN_USER_TICKET: "Ya existe un ticket abierto para este contacto con ",
      ERR_OTHER_OPEN_TICKET: "Ya existe un ticket abierto para este contacto.",
      ERR_NONE_USER_TICKET: "Ya existe un ticket abierto para este contacto sin agente.",
      ERR_SESSION_EXPIRED: "Sesión expirada. Por favor inicie sesión nuevamente.",
      ERR_SENDING_WAPP_MSG: "Error al enviar el mensaje de WhatsApp. Verifique la página de canales.",
      ERR_SYNC_TAGS: "Error al sincronizar las etiquetas.",
      ERR_USER_INACTIVE: "¡Este agente está desactivado!",
      ERR_USER_TICKET_LIMIT: "Límite de tickets alcanzado para este agente.",
      ERR_USER_CREATION_COUNT: "Límite de agentes alcanzado, para cambiar contacte con soporte.",
      ERR_USER_CREATION_DISABLED: "La creación de agentes ha sido deshabilitada por el administrador.",
      ERR_WAPP_CHECK_CONTACT: "No se pudo verificar el contacto de WhatsApp. Verifique la página de canales.",
      ERR_WAPP_DOWNLOAD_MEDIA: "No se pudo descargar el medio de WhatsApp. Verifique la página de canales.",
      ERR_WAPP_GREETING_REQUIRED: "El mensaje de saludo es obligatorio cuando hay más de un sector.",
      ERR_WAPP_INVALID_CONTACT: "Este no es un número de WhatsApp válido.",
      ERR_WAPP_NOT_INITIALIZED: "Esta sesión de WhatsApp no ha sido inicializada. Verifique la página de canales.",
      ERR_WAPP_SESSION_EXPIRED: "Sesión de WhatsApp expirada."
    },
    connections: {
      title: "Canales",
      toasts: {
        deleted: "¡Canal eliminado con éxito!"
      },
      confirmationModal: {
        deleteTitle: "Eliminar",
        deleteMessage: "¿Está seguro? Esta acción no se puede deshacer.",
        disconnectTitle: "Desconectar",
        disconnectMessage: "¿Está seguro? Necesitará escanear el código QR nuevamente."
      },
      buttons: {
        add: "Agregar",
        shutdown: "Eliminar",
        restart: "Reiniciar",
        disconnect: "Desconectar",
        tryAgain: "Intentar nuevamente",
        qrcode: "CÓDIGO QR",
        newQr: "Nuevo CÓDIGO QR",
        connecting: "Conectando"
      },
      toolTips: {
        disconnected: {
          title: "Error al iniciar sesión en WhatsApp",
          content: "Asegúrese de que su teléfono esté conectado a Internet e intente nuevamente, o solicite un nuevo código QR"
        },
        qrcode: {
          title: "Esperando la lectura del código QR",
          content: "Haga clic en el botón 'CÓDIGO QR' y escanee el código QR con su teléfono para iniciar la sesión"
        },
        connected: {
          title: "¡Conexión establecida!"
        },
        timeout: {
          title: "Se perdió la conexión con el teléfono",
          content: "Asegúrese de que su teléfono esté conectado a Internet y que WhatsApp esté abierto, o haga clic en el botón 'Desconectar' para obtener un nuevo código QR"
        }
      },
      table: {
        id: "ID",
        channel: "Canal",
        name: "Nombre",
        color: "Color",
        number: "Número",
        status: "Estado",
        lastUpdate: "Última actualización",
        default: "Predeterminado",
        actions: "Acciones",
        session: "Sesión"
      }
    }
    },
  },
};
  
  export { messages };  