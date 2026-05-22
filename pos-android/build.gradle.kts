// Top-level build file for PharmaCare POS Android
plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
    id("org.sonarqube") version "4.4.1.3373"
}

sonar {
    properties {
        property("sonar.projectKey", "YOUR_SONARCLOUD_PROJECT_KEY")
        property("sonar.organization", "YOUR_SONARCLOUD_ORG_KEY")
        property("sonar.host.url", "https://sonarcloud.io")
    }
}
