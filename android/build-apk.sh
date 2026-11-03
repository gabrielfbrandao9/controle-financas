#!/usr/bin/env bash
# Gera o APK do Minhas Finanças (sem Gradle): copia o site para dentro do app,
# compila, empacota e assina. Resultado: dist/MinhasFinancas-<versão>.apk
#
# Uso (no Git Bash, na pasta do projeto):  bash android/build-apk.sh
#
# Precisa do Android SDK (build-tools 34 e platform 34) e do JDK 17 em
# ANDROID_SDK (padrão: C:\Users\Gabriel\android-sdk).
# Ao publicar uma versão nova, aumente os números em android/versao.txt.
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
AND="$RAIZ/android"
SDK="${ANDROID_SDK:-/c/Users/Gabriel/android-sdk}"
BT="$SDK/build-tools/34.0.0"
PLAT="$SDK/platforms/android-34/android.jar"
JDK="$(ls -d "$SDK"/jdk-17* 2>/dev/null | head -1)"
[ -n "$JDK" ] || { echo "JDK 17 não encontrado em $SDK"; exit 1; }
JAVA="$JDK/bin/java"
JAVAC="$JDK/bin/javac"
KEYTOOL="$JDK/bin/keytool"

read -r VCODE VNAME < "$AND/versao.txt"
OUT="$AND/build"
DIST="$RAIZ/dist"
APK="$DIST/MinhasFinancas-$VNAME.apk"

rm -rf "$OUT"
mkdir -p "$OUT/assets/www" "$OUT/classes" "$DIST"

echo "1/6 Copiando o site para dentro do app"
cp -r "$RAIZ/index.html" "$RAIZ/privacidade.html" "$RAIZ/manifest.webmanifest" "$RAIZ/css" "$RAIZ/js" "$RAIZ/icons" "$OUT/assets/www/"

echo "2/6 Recursos (ícones, tema)"
"$BT/aapt2" compile --dir "$AND/res" -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$PLAT" --manifest "$AND/AndroidManifest.xml" \
  "$OUT/res.zip" --auto-add-overlay \
  --min-sdk-version 24 --target-sdk-version 34 --version-code "$VCODE" --version-name "$VNAME"

echo "3/6 Compilando o Java"
mapfile -t FONTES < <(find "$AND/src" -name '*.java')
"$JAVAC" -nowarn -Xlint:-options -source 8 -target 8 -encoding UTF-8 -bootclasspath "$PLAT" -classpath "$BT/core-lambda-stubs.jar" -d "$OUT/classes" "${FONTES[@]}"

echo "4/6 Convertendo para Android (dex)"
mapfile -t CLASSES < <(find "$OUT/classes" -name '*.class')
"$JAVA" -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --release --min-api 24 --lib "$PLAT" --output "$OUT" "${CLASSES[@]}"
# Arquivos do site entram aqui (e não pelo aapt2 -A, que no Windows grava os
# caminhos com "\" e o Android não acha os arquivos)
(cd "$OUT" && mapfile -t ASSETS < <(find assets -type f) && "$BT/aapt" add base.apk classes.dex "${ASSETS[@]}" >/dev/null)
if "$BT/aapt" list "$OUT/base.apk" | grep -q '\\'; then echo "Erro: caminho com \\ dentro do APK"; exit 1; fi

echo "5/6 Alinhando"
"$BT/zipalign" -f -p 4 "$OUT/base.apk" "$OUT/alinhado.apk"

echo "6/6 Assinando"
KS="$AND/financas.keystore"
PROPS="$AND/assinatura.properties"
if [ ! -f "$KS" ]; then
  # Chave criada uma vez só. GUARDE financas.keystore e assinatura.properties:
  # sem eles, versões novas não instalam por cima da antiga.
  SENHA="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' | head -c 24)"
  "$KEYTOOL" -genkeypair -keystore "$KS" -alias financas -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$SENHA" -keypass "$SENHA" -dname "CN=Minhas Financas" >/dev/null 2>&1
  printf 'senha=%s\n' "$SENHA" > "$PROPS"
fi
SENHA="$(sed -n 's/^senha=//p' "$PROPS")"
"$JAVA" -jar "$BT/lib/apksigner.jar" sign --ks "$KS" --ks-key-alias financas \
  --ks-pass "pass:$SENHA" --key-pass "pass:$SENHA" --out "$APK" "$OUT/alinhado.apk"
"$JAVA" -jar "$BT/lib/apksigner.jar" verify "$APK"
rm -f "$APK.idsig"

echo "Pronto: $APK ($(du -h "$APK" | cut -f1))"
