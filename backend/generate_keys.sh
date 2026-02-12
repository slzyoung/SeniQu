#!/bin/bash
set -e

echo "Generating RSA Private Key..."
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048

echo "Generating Self-Signed X.509 Certificate..."
openssl req -new -x509 -key private.pem -out certificate.pem -days 365 -subj "/CN=seniqu-app"

echo "Generating Public Key..."
openssl pkey -in private.pem -pubout -out public.pem

echo "✅ Keys and Certificate generated successfully!"
