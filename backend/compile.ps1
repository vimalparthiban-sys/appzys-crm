$javacExe = "C:\Program Files\Java\jdk-21.0.10\bin\javac.exe"
$backendDir = "D:\Client Acquisition CRM\backend"
Set-Location $backendDir

if (-not (Test-Path "target\classes")) {
    New-Item -ItemType Directory -Path "target\classes" -Force | Out-Null
}

# Copy resources
if (Test-Path "src\main\resources") {
    Copy-Item -Path "src\main\resources\*" -Destination "target\classes" -Recurse -Force
}

$m2 = "C:\Users\vimal\.m2\repository"
$jars = @(
    "$m2\org\springframework\security\spring-security-crypto\6.2.1\spring-security-crypto-6.2.1.jar",
    "$m2\org\springframework\boot\spring-boot\3.2.4\spring-boot-3.2.4.jar",
    "$m2\org\springframework\boot\spring-boot-autoconfigure\3.2.4\spring-boot-autoconfigure-3.2.4.jar",
    "$m2\ch\qos\logback\logback-classic\1.4.14\logback-classic-1.4.14.jar",
    "$m2\ch\qos\logback\logback-core\1.4.14\logback-core-1.4.14.jar",
    "$m2\org\apache\logging\log4j\log4j-to-slf4j\2.21.1\log4j-to-slf4j-2.21.1.jar",
    "$m2\org\apache\logging\log4j\log4j-api\2.21.1\log4j-api-2.21.1.jar",
    "$m2\org\slf4j\jul-to-slf4j\2.0.12\jul-to-slf4j-2.0.12.jar",
    "$m2\jakarta\annotation\jakarta.annotation-api\2.1.1\jakarta.annotation-api-2.1.1.jar",
    "$m2\org\yaml\snakeyaml\2.2\snakeyaml-2.2.jar",
    "$m2\com\fasterxml\jackson\core\jackson-databind\2.15.4\jackson-databind-2.15.4.jar",
    "$m2\com\fasterxml\jackson\core\jackson-annotations\2.15.4\jackson-annotations-2.15.4.jar",
    "$m2\com\fasterxml\jackson\core\jackson-core\2.15.4\jackson-core-2.15.4.jar",
    "$m2\com\fasterxml\jackson\datatype\jackson-datatype-jdk8\2.15.4\jackson-datatype-jdk8-2.15.4.jar",
    "$m2\com\fasterxml\jackson\datatype\jackson-datatype-jsr310\2.15.4\jackson-datatype-jsr310-2.15.4.jar",
    "$m2\com\fasterxml\jackson\module\jackson-module-parameter-names\2.15.4\jackson-module-parameter-names-2.15.4.jar",
    "$m2\org\apache\tomcat\embed\tomcat-embed-core\10.1.19\tomcat-embed-core-10.1.19.jar",
    "$m2\org\apache\tomcat\embed\tomcat-embed-websocket\10.1.19\tomcat-embed-websocket-10.1.19.jar",
    "$m2\org\springframework\spring-web\6.1.5\spring-web-6.1.5.jar",
    "$m2\org\springframework\spring-beans\6.1.5\spring-beans-6.1.5.jar",
    "$m2\io\micrometer\micrometer-observation\1.12.4\micrometer-observation-1.12.4.jar",
    "$m2\io\micrometer\micrometer-commons\1.12.4\micrometer-commons-1.12.4.jar",
    "$m2\org\springframework\spring-webmvc\6.1.5\spring-webmvc-6.1.5.jar",
    "$m2\org\springframework\spring-aop\6.1.5\spring-aop-6.1.5.jar",
    "$m2\org\springframework\spring-context\6.1.5\spring-context-6.1.5.jar",
    "$m2\org\springframework\spring-expression\6.1.5\spring-expression-6.1.5.jar",
    "$m2\org\aspectj\aspectjweaver\1.9.21\aspectjweaver-1.9.21.jar",
    "$m2\com\zaxxer\HikariCP\5.0.1\HikariCP-5.0.1.jar",
    "$m2\org\springframework\spring-jdbc\6.1.5\spring-jdbc-6.1.5.jar",
    "$m2\org\hibernate\orm\hibernate-core\6.4.4.Final\hibernate-core-6.4.4.Final.jar",
    "$m2\jakarta\persistence\jakarta.persistence-api\3.1.0\jakarta.persistence-api-3.1.0.jar",
    "$m2\jakarta\transaction\jakarta.transaction-api\2.0.1\jakarta.transaction-api-2.0.1.jar",
    "$m2\org\jboss\logging\jboss-logging\3.5.3.Final\jboss-logging-3.5.3.Final.jar",
    "$m2\org\hibernate\common\hibernate-commons-annotations\6.0.6.Final\hibernate-commons-annotations-6.0.6.Final.jar",
    "$m2\io\smallrye\jandex\3.1.2\jandex-3.1.2.jar",
    "$m2\com\fasterxml\classmate\1.6.0\classmate-1.6.0.jar",
    "$m2\net\bytebuddy\byte-buddy\1.14.12\byte-buddy-1.14.12.jar",
    "$m2\org\glassfish\jaxb\jaxb-runtime\4.0.5\jaxb-runtime-4.0.5.jar",
    "$m2\org\glassfish\jaxb\jaxb-core\4.0.5\jaxb-core-4.0.5.jar",
    "$m2\org\eclipse\angus\angus-activation\2.0.2\angus-activation-2.0.2.jar",
    "$m2\org\glassfish\jaxb\txw2\4.0.5\txw2-4.0.5.jar",
    "$m2\com\sun\istack\istack-commons-runtime\4.1.2\istack-commons-runtime-4.1.2.jar",
    "$m2\jakarta\inject\jakarta.inject-api\2.0.1\jakarta.inject-api-2.0.1.jar",
    "$m2\org\antlr\antlr4-runtime\4.13.0\antlr4-runtime-4.13.0.jar",
    "$m2\org\springframework\data\spring-data-jpa\3.2.4\spring-data-jpa-3.2.4.jar",
    "$m2\org\springframework\data\spring-data-commons\3.2.4\spring-data-commons-3.2.4.jar",
    "$m2\org\springframework\spring-orm\6.1.5\spring-orm-6.1.5.jar",
    "$m2\org\springframework\spring-tx\6.1.5\spring-tx-6.1.5.jar",
    "$m2\org\slf4j\slf4j-api\2.0.12\slf4j-api-2.0.12.jar",
    "$m2\org\springframework\spring-aspects\6.1.5\spring-aspects-6.1.5.jar",
    "$m2\org\apache\tomcat\embed\tomcat-embed-el\10.1.19\tomcat-embed-el-10.1.19.jar",
    "$m2\org\hibernate\validator\hibernate-validator\8.0.1.Final\hibernate-validator-8.0.1.Final.jar",
    "$m2\jakarta\validation\jakarta.validation-api\3.0.2\jakarta.validation-api-3.0.2.jar",
    "$m2\com\mysql\mysql-connector-j\8.3.0\mysql-connector-j-8.3.0.jar",
    "$m2\com\h2database\h2\2.2.224\h2-2.2.224.jar",
    "$m2\jakarta\xml\bind\jakarta.xml.bind-api\4.0.2\jakarta.xml.bind-api-4.0.2.jar",
    "$m2\jakarta\activation\jakarta.activation-api\2.1.3\jakarta.activation-api-2.1.3.jar",
    "$m2\org\springframework\spring-core\6.1.5\spring-core-6.1.5.jar",
    "$m2\org\springframework\spring-jcl\6.1.5\spring-jcl-6.1.5.jar",
    "$m2\org\projectlombok\lombok\1.18.30\lombok-1.18.30.jar"
)

$cp = ($jars -join ";") + ";target\classes"
$lombokJar = "$m2\org\projectlombok\lombok\1.18.30\lombok-1.18.30.jar"

# Gather all java source files
Get-ChildItem -Recurse -Filter *.java src\main\java | ForEach-Object { '"' + $_.FullName.Replace('\', '/') + '"' } | Out-File -Encoding ascii sources.txt

Write-Host "Compiling Java sources..."
& $javacExe -d target/classes -cp $cp -processorpath $lombokJar -parameters '@sources.txt'
if ($LASTEXITCODE -eq 0) {
    Write-Host "Java compilation SUCCESSFUL (0 errors)"
} else {
    Write-Host "Java compilation FAILED with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}
