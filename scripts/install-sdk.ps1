. "$PSScriptRoot\android-env.ps1"
$yes = ('y' + [Environment]::NewLine) * 20
$yes | & 'D:\Android\sdk\cmdline-tools\latest\bin\sdkmanager.bat' "platform-tools" "platforms;android-36" "build-tools;36.0.0"
Write-Host "Install finished with exit code $LASTEXITCODE"
