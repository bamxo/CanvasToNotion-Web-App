# Canvas to Notion Web Application

A web application that serves as the backend and frontend interface for the Canvas to Notion integration.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)
- A Notion account
- A Canvas LMS account
- Firebase account (for deployment)

## Installation

1. Clone the repository and navigate to the web app directory:
```bash
cd CanvasToNotion-Web-App
```

2. Install all dependencies (frontend, backend, and e2e testing):
```bash
npm install
npm run install:all
```

## Development

### Running the Application

To start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Project Structure

```
CanvasToNotion-Web-App/
├── frontend/          # React frontend application
├── backend/          # Express backend server
└── e2e/             # End-to-end tests
```

## Dependencies

### Frontend
- React 19
- Vite
- TailwindCSS
- Axios
- React Virtuoso
- tsParticles

### Backend
- Express
- Notion Client
- Google Auth Library
- dotenv

### Development
- TypeScript
- ESLint
- Vitest
- Testing Library
- Various TypeScript type definitions

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
NOTION_API_KEY=your_notion_api_key
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Testing

Run tests for different components:

```bash
# Frontend tests
npm run test:frontend

# Backend tests
npm run test:backend

# End-to-end tests
npm run test:e2e
```

## Building for Production

To build the application for production:
```bash
npm run build
```

## Deployment

The application can be deployed to Firebase:

```bash
# Deploy everything
npm run deploy

# Deploy only hosting
npm run deploy:hosting
```

## Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build the application
- `npm run build:frontend`: Build only the frontend
- `npm run deploy`: Build and deploy to Firebase
- `npm run deploy:hosting`: Build and deploy only hosting
- `npm run lint`: Run ESLint
- `npm run test:frontend`: Run frontend tests
- `npm run test:backend`: Run backend tests
- `npm run test:e2e`: Run end-to-end tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the ISC License.
