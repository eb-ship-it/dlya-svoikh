$env:JAVA_HOME = 'D:\Android\jdk-21'
$env:ANDROID_HOME = 'D:\Android\sdk'
$env:ANDROID_SDK_ROOT = 'D:\Android\sdk'
$env:Path = 'D:\Android\jdk-21\bin;D:\Android\sdk\cmdline-tools\latest\bin;D:\Android\sdk\platform-tools;' + $env:Path
Write-Host "JAVA_HOME=$env:JAVA_HOME"
Write-Host "ANDROID_HOME=$env:ANDROID_HOME"
