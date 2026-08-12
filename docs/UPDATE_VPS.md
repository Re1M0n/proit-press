# Manual de Atualização Automática do ProIT CRM® na VPS

Este manual descreve os passos necessários para realizar a atualização automática do sistema **ProIT CRM®** em sua VPS.

## Passos para Atualização

### 1. Acessar a VPS

Conecte-se à VPS onde o **ProIT CRM®** está instalado. Utilize o usuário apropriado (`root` ou `deploy`), dependendo de sua configuração:

```bash
ssh usuario@ip-da-vps
```

### 2. Navegar até a pasta do sistema

Uma vez conectado à VPS, vá até o diretório onde o sistema está instalado:

```bash
cd ProIT-CRM/
```

### 3. Executar o comando para atualização

Com o diretório correto acessado, execute o comando para atualização abaixo:

```bash
curl -sSL https://raw.githubusercontent.com/Re1M0n/proit-press/main/UPDATE.sh | sudo bash -s
```

> Nota: O script executado será responsável por realizar o processo de atualização automaticamente.

### 4. Finalização

Após a execução do comando, verifique se a atualização foi concluída com sucesso e sem erros. Caso ocorra algum problema, revise os logs ou entre em contato para suporte.
