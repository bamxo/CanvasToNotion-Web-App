# CanvasToNotion Web App

A landing page and user authentication interface for the Canvas to Notion Chrome extension, built with React, TypeScript, and Vite. This web app handles login, settings management, and provides a redirect for users to install the Chrome extension.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (v18 or higher)

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/bamxo/CanvasToNotion-Web-App.git
cd CanvasToNotion-Web-App
```

### Install Dependencies

Install all required dependencies for the project:

```bash
npm install
```

This will install dependencies for the main project. The project consists of three main parts:
- Frontend (React application)
- Backend (API server)
- E2E tests

### Development

To start the development server:

```bash
npm run dev
```

This will start the Vite development server with hot module replacement (HMR).

### Building for Production

To create a production build:

```bash
npm run build
```

### Running Tests

The project includes different types of tests:

- Frontend tests: `npm run test:frontend`
- Backend tests: `npm run test:backend`
- E2E tests: `npm run test:e2e`

## Project Structure

```
CanvasToNotion-Web-App/
├── frontend/     # React frontend application
├── backend/      # Backend API server
├── e2e/         # End-to-end tests
└── ...
```

## License

ISC
