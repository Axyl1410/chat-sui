// Package IDs có thể được set từ environment variables hoặc hardcode
// Ưu tiên: env variable > hardcode value

export const DEVNET_COUNTER_PACKAGE_ID =
  import.meta.env.VITE_DEVNET_COUNTER_PACKAGE_ID || "0xTODO";
export const TESTNET_COUNTER_PACKAGE_ID =
  import.meta.env.VITE_TESTNET_COUNTER_PACKAGE_ID ||
  "0x92966ab7ab075a429cb70a8ffd6d9db5af197657b693a86c7d10f18d47eeb40c";
export const MAINNET_COUNTER_PACKAGE_ID =
  import.meta.env.VITE_MAINNET_COUNTER_PACKAGE_ID || "0xTODO";

export const DEVNET_CHAT_PACKAGE_ID =
  import.meta.env.VITE_DEVNET_CHAT_PACKAGE_ID || "0xTODO";
export const TESTNET_CHAT_PACKAGE_ID =
  import.meta.env.VITE_TESTNET_CHAT_PACKAGE_ID ||
  "0x4ce374f8a60cd6d6afa63acc3b59ed9dff1f2e14a79bc0df65c1dbff54e9c8d9";
export const MAINNET_CHAT_PACKAGE_ID =
  import.meta.env.VITE_MAINNET_CHAT_PACKAGE_ID || "0xTODO";

// Registry IDs (optional - để hardcode thay vì auto-query)
// Nếu không set, app sẽ tự động query từ blockchain
export const DEVNET_PROFILE_REGISTRY_ID =
  import.meta.env.VITE_DEVNET_PROFILE_REGISTRY_ID || null;
export const DEVNET_ROOM_REGISTRY_ID =
  import.meta.env.VITE_DEVNET_ROOM_REGISTRY_ID || null;
export const DEVNET_MESSAGE_REGISTRY_ID =
  import.meta.env.VITE_DEVNET_MESSAGE_REGISTRY_ID || null;
export const DEVNET_MEMBER_REGISTRY_ID =
  import.meta.env.VITE_DEVNET_MEMBER_REGISTRY_ID || null;

export const TESTNET_PROFILE_REGISTRY_ID =
  import.meta.env.VITE_TESTNET_PROFILE_REGISTRY_ID ||
  "0x218fefe70414170f3d8ea33a6cedacb5d861de8496fdced59f2b8c3ffbd07236";
export const TESTNET_ROOM_REGISTRY_ID =
  import.meta.env.VITE_TESTNET_ROOM_REGISTRY_ID ||
  "0x117df5628d31ec47588035e8705c085861a8c92c9fb6a31c3f610b5ad1b3f19d";
export const TESTNET_MESSAGE_REGISTRY_ID =
  import.meta.env.VITE_TESTNET_MESSAGE_REGISTRY_ID ||
  "0x6ea6e8e638ac90c62e5c7e55aff7ff81d64f454826b4ebae0ffa1a08d697a05f";
export const TESTNET_MEMBER_REGISTRY_ID =
  import.meta.env.VITE_TESTNET_MEMBER_REGISTRY_ID ||
  "0xd0c59c2cb986f43e12e4115bc53c58fdd19c248d3fbdea658c9007e5fee9a3d5";

export const MAINNET_PROFILE_REGISTRY_ID =
  import.meta.env.VITE_MAINNET_PROFILE_REGISTRY_ID || null;
export const MAINNET_ROOM_REGISTRY_ID =
  import.meta.env.VITE_MAINNET_ROOM_REGISTRY_ID || null;
export const MAINNET_MESSAGE_REGISTRY_ID =
  import.meta.env.VITE_MAINNET_MESSAGE_REGISTRY_ID || null;
export const MAINNET_MEMBER_REGISTRY_ID =
  import.meta.env.VITE_MAINNET_MEMBER_REGISTRY_ID || null;
