import * as Lark from "@larksuiteoapi/node-sdk";
import * as http from "http";

// Per-account WebSocket clients, HTTP servers, and bot info
// Key: accountId
export const wsClients = new Map<string, Lark.WSClient>();
export const httpServers = new Map<string, http.Server>();

// Key: accountId -> open_id
export const botOpenIds = new Map<string, string>();

// Key: accountId -> [open_id, user_id, union_id]
export const botIdCandidates = new Map<string, string[]>();

// Key: accountId -> botName (from config)
export const botNames = new Map<string, string>();

// Reverse mapping: bot open_id -> account_id (for multi-bot mention forwarding)
// Key: open_id | user_id | union_id -> accountId
export const botIdToAccountId = new Map<string, string>();
