import { useQuery } from "urql";
import {
	GET_USER_DEPOSITS,
	GET_USER_WITHDRAALS,
	GET_ALL_DEPOSITS,
	GET_ALL_WITHDRAWALS,
	GET_STRATEGY_ALLOCATIONS,
	GET_STRATEGY_RECALLS,
	GET_LATEST_ALLOCATIONS_BY_STRATEGY,
} from "./queries";

export interface Deposit {
	id: string;
	sender: string;
	owner: string;
	assets: string;
	shares: string;
	blockNumber: string;
	transactionHash: string;
	timestamp: string;
}

export interface Withdraw {
	id: string;
	sender: string;
	receiver: string;
	owner: string;
	assets: string;
	shares: string;
	blockNumber: string;
	transactionHash: string;
	timestamp: string;
}

export interface StrategyAllocation {
	id: string;
	strategy: string;
	assets: string;
	blockNumber: string;
	transactionHash: string;
	timestamp: string;
}

export interface StrategyRecall {
	id: string;
	strategy: string;
	assets: string;
	blockNumber: string;
	transactionHash: string;
	timestamp: string;
}

export function useUserDeposits(owner: string | null) {
	const [result] = useQuery({
		query: GET_USER_DEPOSITS,
		variables: { owner: owner?.toLowerCase() },
		pause: !owner,
	});

	return {
		data: result.data?.deposits as Deposit[] | undefined,
		error: result.error,
		fetching: result.fetching,
	};
}

export function useUserWithdrawals(owner: string | null) {
	const [result] = useQuery({
		query: GET_USER_WITHDRAALS,
		variables: { owner: owner?.toLowerCase() },
		pause: !owner,
	});

	return {
		data: result.data?.withdraws as Withdraw[] | undefined,
		error: result.error,
		fetching: result.fetching,
	};
}

export function useAllDeposits() {
	const [result] = useQuery({
		query: GET_ALL_DEPOSITS,
	});

	return {
		data: result.data?.deposits as Deposit[] | undefined,
		error: result.error,
		fetching: result.fetching,
	};
}

export function useAllWithdrawals() {
	const [result] = useQuery({
		query: GET_ALL_WITHDRAWALS,
	});

	return {
		data: result.data?.withdraws as Withdraw[] | undefined,
		error: result.error,
		fetching: result.fetching,
	};
}

export function useStrategyAllocations() {
	const [result] = useQuery({
		query: GET_STRATEGY_ALLOCATIONS,
	});

	return {
		data: result.data?.strategyAllocateds as StrategyAllocation[] | undefined,
		error: result.error,
		fetching: result.fetching,
	};
}

export function useStrategyRecalls() {
	const [result] = useQuery({
		query: GET_STRATEGY_RECALLS,
	});

	return {
		data: result.data?.strategyRecalleds as StrategyRecall[] | undefined,
		error: result.error,
		fetching: result.fetching,
	};
}

export function useLatestAllocations() {
	const [result] = useQuery({
		query: GET_LATEST_ALLOCATIONS_BY_STRATEGY,
	});

	return {
		data: result.data?.strategyAllocateds as StrategyAllocation[] | undefined,
		error: result.error,
		fetching: result.fetching,
	};
}
