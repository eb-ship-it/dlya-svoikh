. "$PSScriptRoot\android-env.ps1"
$yes = ('y' + [Environment]::NewLine) * 100
$yes | & 'D:\Android\sdk\cmdline-tools\latest\bin\sdkmanager.bat' --licenses
Write-Host "Licenses step finished with exit code $LASTEXITCODE"
