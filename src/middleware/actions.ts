export const ActionList = [
  "START",
  "UPDATE_USER",
  "UPDATE_SETTINGS",
  "SET_TOKEN",
] as const;

type ActionListType = typeof ActionList;

export type ActionType = ActionListType[number];

export interface Action {
  type: ActionType;
  payload?: any;
}
