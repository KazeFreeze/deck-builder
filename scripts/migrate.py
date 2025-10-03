import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Firebase Initialization from Environment Variables ---
# The service account key is constructed from environment variables.
service_account_info = {
  "type": "service_account",
  "project_id": os.environ.get("FIREBASE_PROJECT_ID"),
  "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID"),
  # Ensure newline characters are correctly interpreted
  "private_key": (os.environ.get("FIREBASE_PRIVATE_KEY") or '').replace('\\n', '\n'),
  "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL"),
  "client_id": os.environ.get("FIREBASE_CLIENT_ID"),
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": os.environ.get("FIREBASE_CLIENT_X509_CERT_URL"),
  "universe_domain": "googleapis.com"
}

# --- Error Handling for Missing Credentials ---
if not all(service_account_info.values()):
    print("Firebase Admin credentials are not fully set in the environment variables.")
    print("Please ensure all required FIREBASE_* variables are in your .env file.")
    exit(1)

cred = credentials.Certificate(service_account_info)
firebase_admin.initialize_app(cred)
db = firestore.client()

# --- Script Configuration ---
FLASHCARDS_DIR = 'public/flashcards'
MULTIPLECHOICE_DIR = 'public/multiplechoice'
SETS_FILE = 'public/sets/sets.json'

# --- Data Migration Logic ---

def migrate_flashcards():
    print('Starting flashcard migration...')
    files = [f for f in os.listdir(FLASHCARDS_DIR) if f.endswith('.json') and f != 'format.json']
    for file in files:
        file_path = os.path.join(FLASHCARDS_DIR, file)
        deck_id = os.path.splitext(file)[0]
        print(f'Processing flashcard deck: {deck_id}')
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                questions = json.load(f)
            doc_ref = db.collection('decks').document(deck_id)
            doc_ref.set({
                'title': deck_id.replace('_', ' ').title(),
                'type': 'flashcards',
                'questions': questions
            })
            print(f'Successfully migrated {deck_id}.')
        except Exception as e:
            print(f'Error migrating {deck_id}: {e}')
    print('Flashcard migration complete.')

def migrate_multiple_choice():
    print('Starting multiple-choice migration...')
    files = [f for f in os.listdir(MULTIPLECHOICE_DIR) if f.endswith('.json')]
    for file in files:
        file_path = os.path.join(MULTIPLECHOICE_DIR, file)
        deck_id = os.path.splitext(file)[0]
        print(f'Processing multiple-choice deck: {deck_id}')
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                deck_data = json.load(f)
            doc_ref = db.collection('decks').document(deck_id)
            doc_ref.set({
                'title': deck_data.get('title', deck_id.replace("-", " ").title()),
                'type': 'multiplechoice',
                'questions': deck_data.get('questions', [])
            })
            print(f'Successfully migrated {deck_id}.')
        except Exception as e:
            print(f'Error migrating {deck_id}: {e}')
    print('Multiple-choice migration complete.')

def migrate_sets():
    print('Starting sets migration...')
    try:
        with open(SETS_FILE, 'r', encoding='utf-8') as f:
            sets = json.load(f)
        sets_collection = db.collection('sets')
        for s in sets:
            set_id = s['title'].lower().replace(' ', '-')
            print(f"Processing set: {s['title']}")
            deck_ids = [os.path.splitext(deck['file'])[0] for deck in s['decks']]
            sets_collection.document(set_id).set({
                'title': s['title'],
                'description': s['description'],
                'deckIds': deck_ids
            })
            print(f"Successfully migrated set: {s['title']}")
    except Exception as e:
        print(f'Error migrating sets: {e}')
    print('Sets migration complete.')

def main():
    # The python-dotenv library is needed to read the .env file
    try:
        __import__('dotenv')
    except ImportError:
        print("python-dotenv is not installed. Please run 'pip install python-dotenv' to continue.")
        exit(1)

    migrate_flashcards()
    migrate_multiple_choice()
    migrate_sets()
    print('\\nAll migration tasks have been executed.')

if __name__ == '__main__':
    main()