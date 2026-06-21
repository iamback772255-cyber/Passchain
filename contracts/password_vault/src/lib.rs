#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Bytes, BytesN, Env, Symbol, Vec,
};

// ── Inter-Contract Client Interface ─────────────────────────────────────────
#[soroban_sdk::contractclient(name = "AuditLoggerClient")]
pub trait AuditLoggerInterface {
    fn log_action(env: Env, user: Address, action: Symbol, timestamp: u64);
}

// ── Storage Keys ────────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    /// Stores encrypted entry data: (user_address, entry_id) -> EncryptedEntry
    Entry(Address, BytesN<32>),
    /// Stores list of entry IDs for a user: user_address -> Vec<BytesN<32>>
    EntryIds(Address),
    /// Stores total entry count for a user: user_address -> u32
    EntryCount(Address),
    /// Address of the Audit Logger contract
    AuditLogger,
}

// ── Data Structures ─────────────────────────────────────────────────────────
#[contracttype]
#[derive(Clone, Debug)]
pub struct EncryptedEntry {
    /// The encrypted payload (JSON of site, username, password, notes, category — all encrypted)
    pub data: Bytes,
    /// Timestamp of when the entry was created/updated (unix ms)
    pub timestamp: u64,
    /// A label for the entry (encrypted)
    pub label: Bytes,
}

// ── TTL Constants ───────────────────────────────────────────────────────────
const DAY_IN_LEDGERS: u32 = 17_280; // ~1 day  (5s per ledger)
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS; // 30 days
const LIFETIME_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS; // 7 days

// ── Contract ────────────────────────────────────────────────────────────────
#[contract]
pub struct PasswordVaultContract;

#[contractimpl]
impl PasswordVaultContract {
    /// Set the Audit Logger contract address
    pub fn set_audit_logger(env: Env, logger: Address) {
        env.storage().instance().set(&DataKey::AuditLogger, &logger);
    }

    /// Get the Audit Logger contract address (if set)
    pub fn get_audit_logger(env: Env) -> Option<Address> {
        env.storage().instance().get(&DataKey::AuditLogger)
    }

    // ── Store / Update an Entry ─────────────────────────────────────────
    /// Store an encrypted password entry. If entry_id already exists, it is overwritten.
    pub fn store_entry(
        env: Env,
        user: Address,
        entry_id: BytesN<32>,
        encrypted_data: Bytes,
        encrypted_label: Bytes,
        timestamp: u64,
    ) {
        // Only the owner can store entries under their address
        user.require_auth();

        let entry = EncryptedEntry {
            data: encrypted_data,
            timestamp,
            label: encrypted_label,
        };

        let entry_key = DataKey::Entry(user.clone(), entry_id.clone());
        let ids_key = DataKey::EntryIds(user.clone());
        let count_key = DataKey::EntryCount(user.clone());

        // Check if this is a new entry or an update
        let is_new = !env.storage().persistent().has(&entry_key);

        // Store the entry
        env.storage().persistent().set(&entry_key, &entry);
        env.storage()
            .persistent()
            .extend_ttl(&entry_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

        if is_new {
            // Add entry_id to the user's list
            let mut ids: Vec<BytesN<32>> = env
                .storage()
                .persistent()
                .get(&ids_key)
                .unwrap_or(Vec::new(&env));

            ids.push_back(entry_id.clone());
            env.storage().persistent().set(&ids_key, &ids);
            env.storage()
                .persistent()
                .extend_ttl(&ids_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

            // Increment count
            let count: u32 = env
                .storage()
                .persistent()
                .get(&count_key)
                .unwrap_or(0);
            env.storage().persistent().set(&count_key, &(count + 1));
            env.storage()
                .persistent()
                .extend_ttl(&count_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        } else {
            // Just bump TTLs on existing index
            if env.storage().persistent().has(&ids_key) {
                env.storage()
                    .persistent()
                    .extend_ttl(&ids_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
            }
        }

        // ── Emit Event ──
        env.events().publish(
            (Symbol::new(&env, "store_entry"), user.clone()),
            entry_id
        );

        // ── Inter-Contract Call to Audit Logger ──
        if let Some(logger_address) = env.storage().instance().get::<_, Address>(&DataKey::AuditLogger) {
            let client = AuditLoggerClient::new(&env, &logger_address);
            client.log_action(&user, &Symbol::new(&env, "store_entry"), &timestamp);
        }
    }

    // ── Get a Single Entry ──────────────────────────────────────────────
    pub fn get_entry(env: Env, user: Address, entry_id: BytesN<32>) -> EncryptedEntry {
        user.require_auth();

        let key = DataKey::Entry(user, entry_id);
        env.storage()
            .persistent()
            .get(&key)
            .expect("Entry not found")
    }

    // ── Get All Entry IDs ───────────────────────────────────────────────
    pub fn get_all_entry_ids(env: Env, user: Address) -> Vec<BytesN<32>> {
        user.require_auth();

        let key = DataKey::EntryIds(user);
        env.storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env))
    }

    // ── Get All Entries (bulk fetch) ────────────────────────────────────
    pub fn get_all_entries(
        env: Env,
        user: Address,
    ) -> Vec<(BytesN<32>, EncryptedEntry)> {
        user.require_auth();

        let ids_key = DataKey::EntryIds(user.clone());
        let ids: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&ids_key)
            .unwrap_or(Vec::new(&env));

        let mut entries = Vec::new(&env);
        for id in ids.iter() {
            let entry_key = DataKey::Entry(user.clone(), id.clone());
            if let Some(entry) = env.storage().persistent().get::<DataKey, EncryptedEntry>(&entry_key) {
                entries.push_back((id, entry));
            }
        }
        entries
    }

    // ── Delete an Entry ─────────────────────────────────────────────────
    pub fn delete_entry(env: Env, user: Address, entry_id: BytesN<32>) {
        user.require_auth();

        let entry_key = DataKey::Entry(user.clone(), entry_id.clone());

        if !env.storage().persistent().has(&entry_key) {
            panic!("Entry not found");
        }

        // Remove from storage
        env.storage().persistent().remove(&entry_key);

        // Remove from ID list
        let ids_key = DataKey::EntryIds(user.clone());
        let ids: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&ids_key)
            .unwrap_or(Vec::new(&env));

        let mut new_ids = Vec::new(&env);
        for id in ids.iter() {
            if id != entry_id {
                new_ids.push_back(id);
            }
        }
        env.storage().persistent().set(&ids_key, &new_ids);
        env.storage()
            .persistent()
            .extend_ttl(&ids_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

        // Decrement count
        let count_key = DataKey::EntryCount(user.clone());
        let count: u32 = env
            .storage()
            .persistent()
            .get(&count_key)
            .unwrap_or(1);
        let new_count = if count > 0 { count - 1 } else { 0 };
        env.storage().persistent().set(&count_key, &new_count);
        env.storage()
            .persistent()
            .extend_ttl(&count_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

        // ── Emit Event ──
        env.events().publish(
            (Symbol::new(&env, "delete_entry"), user.clone()),
            entry_id
        );

        // ── Inter-Contract Call to Audit Logger ──
        if let Some(logger_address) = env.storage().instance().get::<_, Address>(&DataKey::AuditLogger) {
            let client = AuditLoggerClient::new(&env, &logger_address);
            let now = 0u64; // In real usage, you'd fetch ledger timestamp or pass it
            client.log_action(&user, &Symbol::new(&env, "delete_entry"), &now);
        }
    }

    // ── Get Entry Count (no auth needed — public info) ──────────────────
    pub fn get_entry_count(env: Env, user: Address) -> u32 {
        let key = DataKey::EntryCount(user);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    // ── Extend TTL for All User Data ────────────────────────────────────
    /// Utility to keep user data alive by bumping all TTLs
    pub fn extend_ttl(env: Env, user: Address) {
        user.require_auth();

        let ids_key = DataKey::EntryIds(user.clone());
        let ids: Vec<BytesN<32>> = env
            .storage()
            .persistent()
            .get(&ids_key)
            .unwrap_or(Vec::new(&env));

        // Bump each entry
        for id in ids.iter() {
            let entry_key = DataKey::Entry(user.clone(), id);
            if env.storage().persistent().has(&entry_key) {
                env.storage()
                    .persistent()
                    .extend_ttl(&entry_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
            }
        }

        // Bump the index itself
        if env.storage().persistent().has(&ids_key) {
            env.storage()
                .persistent()
                .extend_ttl(&ids_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        }

        let count_key = DataKey::EntryCount(user);
        if env.storage().persistent().has(&count_key) {
            env.storage()
                .persistent()
                .extend_ttl(&count_key, LIFETIME_THRESHOLD, BUMP_AMOUNT);
        }
    }
}

// ── Tests ───────────────────────────────────────────────────────────────────
#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    // Dummy AuditLogger implementation for testing inter-contract communication
    #[contract]
    pub struct MockAuditLogger;

    #[contractimpl]
    impl MockAuditLogger {
        pub fn log_action(env: Env, user: Address, action: Symbol, timestamp: u64) {
            // Write a dummy key to verify it was called
            env.storage().instance().set(&DataKey::EntryCount(user), &1u32);
            env.events().publish((Symbol::new(&env, "audit_log"), action), timestamp);
        }
    }

    #[test]
    fn test_store_and_get() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PasswordVaultContract, ());
        let client = PasswordVaultContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let entry_id = BytesN::from_array(&env, &[1u8; 32]);
        let data = Bytes::from_slice(&env, b"encrypted_password_data");
        let label = Bytes::from_slice(&env, b"encrypted_label");
        let timestamp: u64 = 1_700_000_000;

        // Store
        client.store_entry(&user, &entry_id, &data, &label, &timestamp);

        // Get
        let entry = client.get_entry(&user, &entry_id);
        assert_eq!(entry.data, data);
        assert_eq!(entry.label, label);
        assert_eq!(entry.timestamp, timestamp);

        // Count
        assert_eq!(client.get_entry_count(&user), 1);
    }

    #[test]
    fn test_inter_contract_communication() {
        let env = Env::default();
        env.mock_all_auths();

        let vault_id = env.register(PasswordVaultContract, ());
        let vault_client = PasswordVaultContractClient::new(&env, &vault_id);

        let logger_id = env.register(MockAuditLogger, ());

        // Set the audit logger
        vault_client.set_audit_logger(&logger_id);
        assert_eq!(vault_client.get_audit_logger(), Some(logger_id.clone()));

        let user = Address::generate(&env);
        let entry_id = BytesN::from_array(&env, &[3u8; 32]);
        let data = Bytes::from_slice(&env, b"data");
        let label = Bytes::from_slice(&env, b"label");

        // Trigger store, which should invoke log_action on MockAuditLogger
        vault_client.store_entry(&user, &entry_id, &data, &label, &12345u64);

        // Verify the MockAuditLogger mock behavior occurred
        let _mock_client = MockAuditLoggerClient::new(&env, &logger_id);
        // During store_entry, log_action writes a value of 1u32 to EntryCount key in MockAuditLogger instance storage
        assert!(env.as_contract(&logger_id, || {
            let val: u32 = env.storage().instance().get(&DataKey::EntryCount(user)).unwrap();
            assert_eq!(val, 1u32);
            Some(())
        }).is_some());
    }

    #[test]
    fn test_delete() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PasswordVaultContract, ());
        let client = PasswordVaultContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let entry_id = BytesN::from_array(&env, &[2u8; 32]);
        let data = Bytes::from_slice(&env, b"test_data");
        let label = Bytes::from_slice(&env, b"test_label");

        client.store_entry(&user, &entry_id, &data, &label, &1000u64);
        assert_eq!(client.get_entry_count(&user), 1);

        client.delete_entry(&user, &entry_id);
        assert_eq!(client.get_entry_count(&user), 0);
    }

    #[test]
    fn test_multiple_entries() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register(PasswordVaultContract, ());
        let client = PasswordVaultContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);

        for i in 0..5 {
            let mut id_bytes = [0u8; 32];
            id_bytes[0] = i;
            let entry_id = BytesN::from_array(&env, &id_bytes);
            let data = Bytes::from_slice(&env, b"data");
            let label = Bytes::from_slice(&env, b"label");
            client.store_entry(&user, &entry_id, &data, &label, &(i as u64));
        }

        assert_eq!(client.get_entry_count(&user), 5);

        let ids = client.get_all_entry_ids(&user);
        assert_eq!(ids.len(), 5);
    }
}
