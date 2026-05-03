import { Deposit as DepositEvent } from "../generated/YieldPilotVault/YieldPilotVault";
import { Deposit as DepositEntity } from "../generated/schema";
import { Withdraw as WithdrawEvent } from "../generated/YieldPilotVault/YieldPilotVault";
import { Withdraw as WithdrawEntity } from "../generated/schema";
import { StrategyAllocated as StrategyAllocatedEvent } from "../generated/YieldPilotVault/YieldPilotVault";
import { StrategyAllocated as StrategyAllocatedEntity } from "../generated/schema";
import { StrategyRecalled as StrategyRecalledEvent } from "../generated/YieldPilotVault/YieldPilotVault";
import { StrategyRecalled as StrategyRecalledEntity } from "../generated/schema";
import { StrategyWhitelisted as StrategyWhitelistedEvent } from "../generated/YieldPilotVault/YieldPilotVault";
import { StrategyWhitelisted as StrategyWhitelistedEntity } from "../generated/schema";
import { WithdrawalQueueUpdated as WithdrawalQueueUpdatedEvent } from "../generated/YieldPilotVault/YieldPilotVault";
import { WithdrawalQueueUpdated as WithdrawalQueueUpdatedEntity } from "../generated/schema";
import { BigInt, Bytes } from "@graphprotocol/graph-ts";

export function handleDeposit(event: DepositEvent): void {
	let entity = new DepositEntity(
		event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
	);
	entity.sender = event.params.sender;
	entity.owner = event.params.owner;
	entity.assets = event.params.assets;
	entity.shares = event.params.shares;
	entity.blockNumber = event.block.number;
	entity.transactionHash = event.transaction.hash;
	entity.timestamp = event.block.timestamp;
	entity.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
	let entity = new WithdrawEntity(
		event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
	);
	entity.sender = event.params.sender;
	entity.receiver = event.params.receiver;
	entity.owner = event.params.owner;
	entity.assets = event.params.assets;
	entity.shares = event.params.shares;
	entity.blockNumber = event.block.number;
	entity.transactionHash = event.transaction.hash;
	entity.timestamp = event.block.timestamp;
	entity.save();
}

export function handleStrategyAllocated(event: StrategyAllocatedEvent): void {
	let entity = new StrategyAllocatedEntity(
		event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
	);
	entity.strategy = event.params.strategy;
	entity.assets = event.params.assets;
	entity.blockNumber = event.block.number;
	entity.transactionHash = event.transaction.hash;
	entity.timestamp = event.block.timestamp;
	entity.save();
}

export function handleStrategyRecalled(event: StrategyRecalledEvent): void {
	let entity = new StrategyRecalledEntity(
		event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
	);
	entity.strategy = event.params.strategy;
	entity.assets = event.params.assets;
	entity.blockNumber = event.block.number;
	entity.transactionHash = event.transaction.hash;
	entity.timestamp = event.block.timestamp;
	entity.save();
}

export function handleStrategyWhitelisted(
	event: StrategyWhitelistedEvent,
): void {
	let entity = new StrategyWhitelistedEntity(
		event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
	);
	entity.strategy = event.params.strategy;
	entity.blockNumber = event.block.number;
	entity.transactionHash = event.transaction.hash;
	entity.timestamp = event.block.timestamp;
	entity.save();
}

export function handleWithdrawalQueueUpdated(
	event: WithdrawalQueueUpdatedEvent,
): void {
	let entity = new WithdrawalQueueUpdatedEntity(
		event.transaction.hash.toHex() + "-" + event.logIndex.toString(),
	);
	entity.queue = event.params.queue.map<Bytes>((addr) => addr);
	entity.blockNumber = event.block.number;
	entity.transactionHash = event.transaction.hash;
	entity.timestamp = event.block.timestamp;
	entity.save();
}
