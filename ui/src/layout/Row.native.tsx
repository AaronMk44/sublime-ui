import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import type { FlexAlign, FlexJustify, RowProps } from './Stack.types';

const ALIGN: Record<FlexAlign, ViewStyle['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY: Record<FlexJustify, ViewStyle['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export function Row({ children, gap, align, justify, wrap, testID }: RowProps) {
  const style: ViewStyle = {
    flexDirection: 'row',
    flexWrap: wrap ? 'wrap' : undefined,
    gap,
    alignItems: align ? ALIGN[align] : undefined,
    justifyContent: justify ? JUSTIFY[justify] : undefined,
  };
  return (
    <View testID={testID} style={style}>
      {children}
    </View>
  );
}
