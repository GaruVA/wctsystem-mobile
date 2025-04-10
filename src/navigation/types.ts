// Simple flat navigation type without nesting
export type RootStackParamList = {
  Guideline: undefined;
  Map: undefined;
  CollectorLogin: undefined;
  CollectorMain: undefined;
};

// Helper type to get navigation prop types
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}