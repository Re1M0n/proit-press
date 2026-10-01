@echo off
setlocal

rem Build the Android app with the local toolchain already installed for DrApp.
rem Override ANDROID_TOOLCHAIN_HOME if the shared .toolchain directory moves.
set "PROJECT_DIR=%~dp0"
if defined ANDROID_TOOLCHAIN_HOME (
  set "TOOLCHAIN_HOME=%ANDROID_TOOLCHAIN_HOME%"
) else (
  set "TOOLCHAIN_HOME=%USERPROFILE%\Documents\.0-proyectos\DrApp\.toolchain"
)
set "JAVA_HOME=%TOOLCHAIN_HOME%\jdk-21"
set "ANDROID_HOME=%TOOLCHAIN_HOME%\android-sdk"
set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
set "SDKMANAGER=%ANDROID_HOME%\cmdline-tools\latest\bin\sdkmanager.bat"
set "PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%"

if not exist "%JAVA_HOME%\bin\java.exe" (
  echo ERROR: No encuentro el JDK en "%JAVA_HOME%".
  echo Define ANDROID_TOOLCHAIN_HOME o instala JDK 21 en la carpeta jdk-21.
  exit /b 1
)
"%JAVA_HOME%\bin\javac.exe" -version 2>&1 | findstr /B /C:"javac 21" >nul
if errorlevel 1 (
  echo ERROR: Se requiere JDK 21 en "%JAVA_HOME%" para compilar Capacitor.
  exit /b 1
)
if not exist "%SDKMANAGER%" (
  echo ERROR: No encuentro Android sdkmanager en "%SDKMANAGER%".
  exit /b 1
)
if not exist "%PROJECT_DIR%android\gradlew.bat" (
  echo ERROR: No encuentro el Gradle wrapper de Android.
  exit /b 1
)

rem PressTicket targets API 36; install it into the shared SDK only if missing.
if not exist "%ANDROID_HOME%\platforms\android-36\android.jar" (
  echo Instalando Android SDK Platform 36...
  call "%SDKMANAGER%" --sdk_root="%ANDROID_HOME%" "platforms;android-36"
  if errorlevel 1 exit /b 1
)
if not exist "%ANDROID_HOME%\build-tools\36.0.0\aapt.exe" (
  echo Instalando Android Build Tools 36.0.0...
  call "%SDKMANAGER%" --sdk_root="%ANDROID_HOME%" "build-tools;36.0.0"
  if errorlevel 1 exit /b 1
)

if not exist "%PROJECT_DIR%android\app\google-services.json" (
  echo AVISO: falta android\app\google-services.json; el APK no tendra la configuracion Firebase.
)

pushd "%PROJECT_DIR%"
echo === Compilando frontend ===
call npm run build
if errorlevel 1 goto failed

echo === Sincronizando Capacitor ===
call npx cap sync android
if errorlevel 1 goto failed

echo === Compilando APK debug ===
call android\gradlew.bat -p android assembleDebug
if errorlevel 1 goto failed

echo.
echo APK listo: %PROJECT_DIR%android\app\build\outputs\apk\debug\app-debug.apk
popd
exit /b 0

:failed
set "BUILD_EXIT=%ERRORLEVEL%"
popd
echo.
echo ERROR: fallo la compilacion (codigo %BUILD_EXIT%).
exit /b %BUILD_EXIT%
