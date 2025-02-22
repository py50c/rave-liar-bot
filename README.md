# AI Job Prep App

This is a Telegram bot that simulates job interviews using Google Gemini-1.5 flash model and stores chat history in Firestore.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/ai-job-interview-prep.git
   cd ai-job-interview-prep
   ```

2. Install dependencies:

   ```bash
   npm install grammy @google-cloud/firestore google-auth-library dotenv
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add the following:

   ```dotenv
   BOT_TOKEN=your-telegram-bot-token
   FIRESTORE_PROJECT_ID=your-firestore-project-id
   GOOGLE_APPLICATION_CREDENTIALS=path-to-your-service-account-file.json
   ```

4. Run the bot:
   ```bash
   node bot.js
   ```

## Usage

- Start the bot by sending the `/start` command. This will clear the chat and start a new interview.
- The bot will ask which company you would like to simulate (e.g., Google, Amazon).
- Send your responses, and the bot will reply with AI-generated interview questions and feedback.

## License

This project is licensed under the MIT License.
