// Mock for react-native-safe-area-context
import React from 'react';
import { View } from 'react-native';

export const SafeAreaView = (props: any) => {
  const { children, ...restProps } = props;
  return React.createElement(View, restProps, children);
};

export const useSafeAreaInsets = () => ({
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
});

