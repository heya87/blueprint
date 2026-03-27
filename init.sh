#!/usr/bin/env bash
set -e

# Cross-platform sed in-place
sedi() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "$@"
  else
    sed -i "$@"
  fi
}

echo ""
echo "Blueprint Init"
echo "=============="
echo ""

# 1. App name
read -p "App name (lowercase letters, numbers, underscores only, e.g. myshop): " APP_NAME
if [[ -z "$APP_NAME" ]]; then
  echo "Error: app name cannot be empty."
  exit 1
fi
if [[ ! "$APP_NAME" =~ ^[a-z][a-z0-9_]*$ ]]; then
  echo "Error: app name must start with a lowercase letter and contain only lowercase letters, numbers, or underscores (no hyphens)."
  exit 1
fi

# 2. Domain
read -p "Domain (e.g. myshop.com): " DOMAIN
if [[ -z "$DOMAIN" ]]; then
  echo "Error: domain cannot be empty."
  exit 1
fi

# 3. Java home
echo ""
echo "Java home path for Gradle (leave empty to skip, e.g. /Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home):"
read -p "> " JAVA_HOME_PATH

echo ""
echo "Replacing blueprint references..."

# Kotlin source files
find backend/src -name "*.kt" | while read -r file; do
  sedi "s/ch\.blueprint/ch.$APP_NAME/g" "$file"
done

# Build files
sedi "s/group = \"ch\.blueprint\"/group = \"ch.$APP_NAME\"/g" backend/build.gradle.kts

# application.properties
sedi "s/myapp\.com/$DOMAIN/g" backend/src/main/resources/application.properties

# .env.example
sedi "s/myapp\.com/$DOMAIN/g" .env.example

# Frontend layout title
sedi "s/title: \"Blueprint\"/title: \"$APP_NAME\"/g" frontend/src/app/layout.tsx

# Rename Kotlin package directory
if [ -d "backend/src/main/kotlin/ch/blueprint" ]; then
  mv "backend/src/main/kotlin/ch/blueprint" "backend/src/main/kotlin/ch/$APP_NAME"
fi

# gradle.properties
if [[ -n "$JAVA_HOME_PATH" ]]; then
  sedi "s|org.gradle.java.home=.*|org.gradle.java.home=$JAVA_HOME_PATH|g" backend/gradle.properties
else
  sedi "/org.gradle.java.home/d" backend/gradle.properties
fi

echo ""
echo "Done. Next steps:"
echo "  1. Generate JWT keys (see SETUP.md)"
echo "  2. cp .env.example .env and fill in values"
echo "  3. cd backend && ./gradlew quarkusDev"
echo "  4. cd frontend && npm run dev"
echo ""
