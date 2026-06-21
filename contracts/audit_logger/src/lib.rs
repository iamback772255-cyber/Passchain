#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, Symbol, Vec,
};

#[contracttype]
#[derive(Clone, Debug)]
pub struct AuditEntry {
    pub action: Symbol,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Logs(Address),
}

const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const LIFETIME_THRESHOLD: u32 = 7 * DAY_IN_LEDGERS;

#[contract]
pub struct AuditLoggerContract;

#[contractimpl]
impl AuditLoggerContract {
    /// Log an action for a user. In inter-contract communication, this is called by the PasswordVault contract.
    pub fn log_action(env: Env, user: Address, action: Symbol, timestamp: u64) {
        // Authenticate user or contract calling it
        let key = DataKey::Logs(user.clone());
        let mut logs: Vec<AuditEntry> = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or(Vec::new(&env));

        logs.push_back(AuditEntry { action, timestamp });

        env.storage().persistent().set(&key, &logs);
        env.storage()
            .persistent()
            .extend_ttl(&key, LIFETIME_THRESHOLD, BUMP_AMOUNT);

        // Emit an audit event
        env.events().publish((Symbol::new(&env, "audit_log"), user), action);
    }

    /// Retrieve the audit logs for a user
    pub fn get_logs(env: Env, user: Address) -> Vec<AuditEntry> {
        let key = DataKey::Logs(user);
        env.storage().persistent().get(&key).unwrap_or(Vec::new(&env))
    }
}
