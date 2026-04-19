. "$PSScriptRoot\android-env.ps1"
Set-Location 'c:\Users\Lena\projects\dlya-svoikh\android'
& '.\gradlew.bat' assembleDebug --no-daemon
Write-Host "Gradle finished with exit code $LASTEXITCODE"
