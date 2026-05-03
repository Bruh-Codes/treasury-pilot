import { gql } from "urql";

export const GET_USER_DEPOSITS = gql`
	query GetUserDeposits($owner: String!) {
		deposits(
			where: { owner: $owner }
			orderBy: timestamp
			orderDirection: desc
		) {
			id
			sender
			owner
			assets
			shares
			blockNumber
			transactionHash
			timestamp
		}
	}
`;

export const GET_USER_WITHDRAALS = gql`
	query GetUserWithdrawals($owner: String!) {
		withdraws(
			where: { owner: $owner }
			orderBy: timestamp
			orderDirection: desc
		) {
			id
			sender
			receiver
			owner
			assets
			shares
			blockNumber
			transactionHash
			timestamp
		}
	}
`;

export const GET_ALL_DEPOSITS = gql`
	query GetAllDeposits {
		deposits(orderBy: timestamp, orderDirection: desc, first: 50) {
			id
			sender
			owner
			assets
			shares
			blockNumber
			transactionHash
			timestamp
		}
	}
`;

export const GET_ALL_WITHDRAWALS = gql`
	query GetAllWithdrawals {
		withdraws(orderBy: timestamp, orderDirection: desc, first: 50) {
			id
			sender
			receiver
			owner
			assets
			shares
			blockNumber
			transactionHash
			timestamp
		}
	}
`;

export const GET_STRATEGY_ALLOCATIONS = gql`
	query GetStrategyAllocations {
		strategyAllocateds(orderBy: timestamp, orderDirection: desc, first: 50) {
			id
			strategy
			assets
			blockNumber
			transactionHash
			timestamp
		}
	}
`;

export const GET_STRATEGY_RECALLS = gql`
	query GetStrategyRecalls {
		strategyRecalleds(orderBy: timestamp, orderDirection: desc, first: 50) {
			id
			strategy
			assets
			blockNumber
			transactionHash
			timestamp
		}
	}
`;

export const GET_LATEST_ALLOCATIONS_BY_STRATEGY = gql`
	query GetLatestAllocationsByStrategy {
		strategyAllocateds(orderBy: timestamp, orderDirection: desc, first: 100) {
			id
			strategy
			assets
			timestamp
		}
	}
`;
