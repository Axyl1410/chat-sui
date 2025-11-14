# Sui dApp Starter Template

This dApp was created using `@mysten/create-dapp` that sets up a basic React
Client dApp using the following tools:

- [React](https://react.dev/) as the UI framework
- [TypeScript](https://www.typescriptlang.org/) for type checking
- [Vite](https://vitejs.dev/) for build tooling
- [Radix UI](https://www.radix-ui.com/) for pre-built UI components
- [ESLint](https://eslint.org/) for linting
- [`@mysten/dapp-kit`](https://sdk.mystenlabs.com/dapp-kit) for connecting to
  wallets and loading data
- [pnpm](https://pnpm.io/) for package management

For a full guide on how to build this dApp from scratch, visit this
[guide](http://docs.sui.io/guides/developer/app-examples/e2e-counter#frontend).

## Deploying your Move code

### Install Sui cli

Before deploying your move code, ensure that you have installed the Sui CLI. You
can follow the [Sui installation instruction](https://docs.sui.io/build/install)
to get everything set up.

This template uses `testnet` by default, so we'll need to set up a testnet
environment in the CLI:

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
```

If you haven't set up an address in the sui client yet, you can use the
following command to get a new address:

```bash
sui client new-address secp256k1
```

This well generate a new address and recover phrase for you. You can mark a
newly created address as you active address by running the following command
with your new address:

```bash
sui client switch --address 0xYOUR_ADDRESS...
```

We can ensure we have some Sui in our new wallet by requesting Sui from the
faucet `https://faucet.sui.io`.

### Publishing the move package

The move code for this template is located in the `move` directory. To publish
it, you can enter the `move` directory, and publish it with the Sui CLI:

```bash
cd move
sui client publish --gas-budget 100000000 counter
```

In the output there will be an object with a `"packageId"` property. You'll want
to save that package ID.

### Cách 1: Sử dụng Environment Variables (Khuyến nghị)

1. Copy file `.env.example` thành `.env`:
```bash
cp .env.example .env
```

2. Mở file `.env` và điền package ID của bạn:
```env
VITE_TESTNET_CHAT_PACKAGE_ID=0xYOUR_PACKAGE_ID_HERE
```

### Cách 2: Sửa trực tiếp trong `src/constants.ts`

```ts
export const TESTNET_CHAT_PACKAGE_ID = "0xYOUR_PACKAGE_ID_HERE";
```

**Lưu ý**: Nếu bạn set cả env variable và hardcode, env variable sẽ được ưu tiên.

### Deploy Chat Contract

Để deploy chat contract:

```bash
cd move/chat
sui client publish --gas-budget 100000000 .
```

Sau khi deploy, copy package ID và điền vào `.env` hoặc `constants.ts`.

Now that we have published the move code, and update the package ID, we can
start the app.

## Starting your dApp

### 1. Cài đặt dependencies

```bash
pnpm install
```

### 2. Cấu hình Environment Variables

Tạo file `.env` từ `.env.example`:

```bash
cp .env.example .env
```

Mở file `.env` và điền các package IDs sau khi deploy contract:

```env
# Chat Package IDs (bắt buộc cho chat app)
VITE_TESTNET_CHAT_PACKAGE_ID=0xYOUR_CHAT_PACKAGE_ID

# Counter Package IDs (optional - chỉ cần nếu dùng counter demo)
VITE_TESTNET_COUNTER_PACKAGE_ID=0xYOUR_COUNTER_PACKAGE_ID
```

**Lưu ý**: 
- Tất cả env variables phải có prefix `VITE_` để Vite có thể đọc được
- File `.env` đã được thêm vào `.gitignore` nên sẽ không bị commit lên git

### 3. Chạy dApp

To start your dApp in development mode run

```bash
pnpm dev
```

## Building

To build your app for deployment you can run

```bash
pnpm build
```
