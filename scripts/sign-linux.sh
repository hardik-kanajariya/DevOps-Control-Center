#!/bin/bash

# Linux Package Signing Script
# Signs .deb, .rpm, and other Linux packages using GPG

set -e  # Exit on any error

echo "🐧 Starting Linux package signing..."

# Check if GPG key is provided
GPG_KEY="${GPG_KEY}"
GPG_PASSPHRASE="${GPG_PASSPHRASE}"

if [ -z "$GPG_KEY" ]; then
  echo "⚠️ No GPG key specified (GPG_KEY environment variable), skipping Linux signing"
  exit 0
fi

echo "🔐 GPG key found, proceeding with package signing..."

# Import GPG key if provided as base64
if [ -n "$GPG_KEY" ]; then
  echo "📥 Importing GPG key..."
  echo "$GPG_KEY" | base64 -d | gpg --import --batch --yes
  if [ $? -eq 0 ]; then
    echo "✅ GPG key imported successfully"
  else
    echo "❌ Failed to import GPG key"
    exit 1
  fi
fi

# Get the signing key ID
KEY_ID=$(gpg --list-secret-keys --keyid-format LONG | grep sec | head -n1 | sed 's/.*\/\([A-F0-9]*\).*/\1/')
if [ -z "$KEY_ID" ]; then
  echo "❌ No signing key found in GPG keyring"
  exit 1
fi
echo "🔑 Using signing key: $KEY_ID"

# Function to sign .deb packages
sign_deb_packages() {
  local deb_count=0
  for package in dist/*.deb; do
    if [ -f "$package" ]; then
      echo "📦 Signing Debian package: $(basename "$package")"
      if command -v dpkg-sig >/dev/null 2>&1; then
        dpkg-sig --sign builder "$package"
        deb_count=$((deb_count + 1))
      else
        echo "⚠️ dpkg-sig not available, using debsign"
        if command -v debsign >/dev/null 2>&1; then
          debsign -k "$KEY_ID" "$package"
          deb_count=$((deb_count + 1))
        else
          echo "❌ Neither dpkg-sig nor debsign available for signing .deb packages"
        fi
      fi
    fi
  done
  echo "✅ Signed $deb_count Debian packages"
}

# Function to sign .rpm packages
sign_rpm_packages() {
  local rpm_count=0
  for package in dist/*.rpm; do
    if [ -f "$package" ]; then
      echo "📦 Signing RPM package: $(basename "$package")"
      if command -v rpmsign >/dev/null 2>&1; then
        rpmsign --addsign "$package"
        rpm_count=$((rpm_count + 1))
      elif command -v rpm >/dev/null 2>&1; then
        rpm --addsign "$package"
        rpm_count=$((rpm_count + 1))
      else
        echo "❌ rpm or rpmsign not available for signing .rpm packages"
      fi
    fi
  done
  echo "✅ Signed $rpm_count RPM packages"
}

# Function to create detached signatures for other files
sign_other_packages() {
  local other_count=0
  for package in dist/*.{AppImage,tar.gz,snap}; do
    if [ -f "$package" ] && [[ "$package" != *".sig" ]]; then
      echo "📦 Creating detached signature for: $(basename "$package")"
      gpg --batch --yes --detach-sign --armor --local-user "$KEY_ID" "$package"
      if [ -f "$package.asc" ]; then
        echo "✅ Created signature: $(basename "$package").asc"
        other_count=$((other_count + 1))
      fi
    fi
  done
  echo "✅ Created $other_count detached signatures"
}

# Function to create checksums
create_checksums() {
  echo "📊 Creating checksums..."
  cd dist
  
  # Create SHA256 checksums
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum *.{deb,rpm,AppImage,tar.gz,snap} 2>/dev/null > SHA256SUMS || true
    if [ -f "SHA256SUMS" ]; then
      echo "✅ Created SHA256SUMS"
      # Sign the checksums file
      gpg --batch --yes --clearsign --local-user "$KEY_ID" SHA256SUMS
      if [ -f "SHA256SUMS.asc" ]; then
        echo "✅ Signed SHA256SUMS"
      fi
    fi
  fi
  
  cd ..
}

# Main signing process
echo "🚀 Starting package signing process..."

# Sign different package types
sign_deb_packages
sign_rpm_packages
sign_other_packages
create_checksums

echo "🎉 Linux package signing completed successfully"

# Verify signatures
echo "🔍 Verifying signatures..."
verification_count=0
for sig_file in dist/*.asc; do
  if [ -f "$sig_file" ]; then
    if gpg --verify "$sig_file" >/dev/null 2>&1; then
      echo "✅ Verified: $(basename "$sig_file")"
      verification_count=$((verification_count + 1))
    else
      echo "❌ Failed to verify: $(basename "$sig_file")"
    fi
  fi
done

echo "✅ Verified $verification_count signatures"
echo "🏁 Linux signing process completed"
