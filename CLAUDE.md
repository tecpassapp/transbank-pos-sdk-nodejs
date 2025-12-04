# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Official Transbank SDK for Node.js to communicate with POS terminals (Verifone vx520, vx520c, Ingenico 3500, and Self-service POS). The SDK provides serial port communication with POS devices for payment processing operations.

## Development Commands

```bash
npm install         # Install dependencies (requires Python 3 for serialport native module)
npm run build       # Build for production using webpack (outputs to dist/transbank.js)
npm start           # Build with watch mode
npm run dev         # Run interactive example application
```

**Note:** Tests are not yet implemented (`npm test` exits with error).

## Requirements

- Node.js 20+
- Python 3 (required for serialport native compilation)

## Architecture

### Class Hierarchy

```
POSBase (EventEmitter)
├── POSIntegrado      # For integrated POS terminals (115200 baud)
└── POSAutoservicio   # For self-service POS terminals (19200 baud)
```

### Source Files

- `index.js` - Entry point, exports `POSIntegrado` and `POSAutoservicio`
- `src/PosBase.js` - Base class handling serial port communication, ACK/response protocol, and shared commands (poll, loadKeys)
- `src/PosIntegrado.js` - Integrated POS implementation (sale, multicodeSale, refund, closeDay, getTotals, salesDetail)
- `src/PosAutoservicio.js` - Self-service POS implementation (includes voucher support, initialization commands)
- `src/responseCodes.js` - Spanish response code messages for POS responses

### Communication Protocol

The SDK implements a serial protocol with:
- STX/ETX framing with LRC checksum (via `lrc-calculator`)
- ACK-based acknowledgment with configurable timeout (default 2000ms)
- Response timeout for POS operations (default 150000ms)
- Inter-byte timeout parsing (100ms) for message boundaries
- Function codes identify operations (e.g., `0100` = poll, `0200` = sale, `0800` = loadKeys)

### Key Methods Pattern

Commands return Promises that resolve to structured response objects containing:
- `functionCode`, `responseCode`, `responseMessage`
- `successful` - boolean derived from `responseCode === 0`
- Operation-specific fields (amount, authorizationCode, terminalId, etc.)

## Contributing Guidelines

From README.md:
- Commits follow Angular commit conventions
- Branch names: lowercase with `-` separators, prefixed with token (feat/, fix/, docs/, etc.)
- PRs require 2+ approvals
- Include tests or video/gif demonstrating functionality
- Use imperative mood in commit messages

### Release Process

1. Create PR titled "Prepare release X.Y.Z"
2. Update `CHANGELOG.md` with user-facing changes in Spanish
3. Update version in `package.json`
4. After merge, create GitHub release with tag `vX.Y.Z`
5. Publish to npm manually with `npm publish` (requires TransbankDevelopers login)
