#!/bin/bash
# Setup script for Anonymous Contact Message System
# This script creates a virtual environment and installs all required dependencies

set -e  # Exit on any error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="${SCRIPT_DIR}/contact-venv"

echo "🚀 Setting up Anonymous Contact Message System..."
echo "📍 Working directory: ${SCRIPT_DIR}"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
echo "🐍 Found Python ${PYTHON_VERSION}"

# Check if virtual environment already exists
if [ -d "${VENV_DIR}" ]; then
    echo "📁 Virtual environment already exists at: ${VENV_DIR}"
    read -p "Do you want to recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Removing existing virtual environment..."
        rm -rf "${VENV_DIR}"
    else
        echo "✅ Using existing virtual environment"
    fi
fi

# Create virtual environment if it doesn't exist
if [ ! -d "${VENV_DIR}" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv "${VENV_DIR}"
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source "${VENV_DIR}/bin/activate"

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install requirements
if [ -f "${SCRIPT_DIR}/requirements.txt" ]; then
    echo "📋 Installing requirements from requirements.txt..."
    pip install -r "${SCRIPT_DIR}/requirements.txt"
else
    echo "📋 Installing requirements directly..."
    pip install fastapi uvicorn[standard] click rich pydantic python-multipart
fi

echo ""
echo "✅ Setup completed successfully!"
echo ""
echo "🎯 Next steps:"
echo "1. Set your admin password:"
echo "   export CONTACT_ADMIN_PASSWORD=your_secure_password"
echo ""
echo "2. Activate the virtual environment:"
echo "   source ${VENV_DIR}/bin/activate"
echo ""
echo "3. Start the contact system:"
echo "   python contact-me.py                    # Start API server"
echo "   python contact-me.py --cli              # Interactive CLI mode"
echo "   python contact-me.py --list             # List messages"
echo "   python contact-me.py --help             # Show all options"
echo ""
echo "📊 API will be available at: http://localhost:8000"
echo "📁 Database will be created as: contact_messages.db"
echo ""
echo "🔧 To deactivate the virtual environment later, run: deactivate"