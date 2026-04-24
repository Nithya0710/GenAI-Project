#!/usr/bin/env python3
"""
test_gemini_connection.py — Run this from the backend/ directory to diagnose
the 502 error before starting the full FastAPI server.

Usage:
    cd backend
    python test_gemini_connection.py

What it checks:
    1. .env file is found and GOOGLE_API_KEY is present
    2. The API key is valid (not expired / wrong project)
    3. The model name is accessible (quota / region / model availability)
    4. A minimal generation call succeeds
"""

import os
import sys
import traceback

try:
    from dotenv import load_dotenv
    load_dotenv()
    print("[OK] dotenv loaded")
except ImportError:
    print("[WARN] python-dotenv not installed — reading from environment directly")

# ---------------------------------------------------------------------------
# Step 1: Check API key
# ---------------------------------------------------------------------------

api_key = os.getenv("GOOGLE_API_KEY", "")
model   = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")

if not api_key:
    print("\n[FAIL] GOOGLE_API_KEY is not set.")
    print("  Fix: add  GOOGLE_API_KEY=your_key_here  to backend/.env")
    sys.exit(1)

masked = api_key[:6] + "..." + api_key[-4:]
print(f"[OK] GOOGLE_API_KEY found: {masked}")
print(f"[OK] GEMINI_MODEL = {model}")

# ---------------------------------------------------------------------------
# Step 2: Import SDK
# ---------------------------------------------------------------------------

try:
    import google.generativeai as genai
    print("[OK] google-generativeai imported")
except ImportError:
    print("\n[FAIL] google-generativeai is not installed.")
    print("  Fix: pip install google-generativeai==0.7.2")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Step 3: Configure + basic generation call
# ---------------------------------------------------------------------------

genai.configure(api_key=api_key)

try:
    print(f"\n[...] Calling {model} with a minimal prompt...")
    m        = genai.GenerativeModel(model_name=model)
    response = m.generate_content("Reply with exactly: HELLO")

    if response.candidates:
        print(f"[OK] Got response: {response.text.strip()!r}")
    else:
        print(f"[FAIL] No candidates returned. prompt_feedback: {response.prompt_feedback}")
        sys.exit(1)

except Exception as exc:
    print(f"\n[FAIL] Gemini call raised {type(exc).__name__}:")
    print()
    traceback.print_exc()
    print()

    name = type(exc).__name__
    msg  = str(exc).lower()

    if "resourceexhausted" in name or "quota" in msg or "429" in msg:
        print("DIAGNOSIS: Quota exceeded.")
        print("  - You've hit the free-tier RPM or RPD limit.")
        print("  - Wait ~1 minute and try again, or enable billing in Google AI Studio.")
        print("  - Or switch to gemini-1.5-flash (faster quota recovery) in your .env.")

    elif "invalidargument" in name or "api key" in msg or "permission" in msg or "401" in msg or "403" in msg:
        print("DIAGNOSIS: Invalid or restricted API key.")
        print("  - Double-check GOOGLE_API_KEY in backend/.env")
        print("  - Make sure the key has the Generative Language API enabled.")
        print("  - Get a key at: https://aistudio.google.com/app/apikey")

    elif "notfound" in name or "not found" in msg or "404" in msg:
        print(f"DIAGNOSIS: Model '{model}' not found.")
        print("  - Change GEMINI_MODEL in backend/.env to one of:")
        print("      gemini-1.5-flash  (recommended for dev)")
        print("      gemini-1.5-pro")
        print("      gemini-1.0-pro")

    elif "deadline" in name.lower() or "timeout" in msg:
        print("DIAGNOSIS: Request timed out.")
        print("  - Check your internet connection.")
        print("  - Gemini may be temporarily slow — try again in a few seconds.")

    else:
        print("DIAGNOSIS: Unknown error — see traceback above.")

    sys.exit(1)

print("\n=== Gemini connection OK — the API key and model are working ===")
print("If you still see 502 in FastAPI, restart uvicorn and check the terminal")
print("for the full traceback (it will now be logged by llm_service.py).")
