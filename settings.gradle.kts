pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
        maven("https://plugins.gradle.org/m2/") {
            content {
                includeGroupByRegex("org\\.jetbrains\\.kotlin.*")
                includeGroup("junit")
                includeGroup("org.hamcrest")
            }
        }
    }
}

rootProject.name = "GodvillePlus"
include(":app")
