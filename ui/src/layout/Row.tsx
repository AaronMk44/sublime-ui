import type { CSSProperties } from 'react';
import type { FlexAlign, FlexJustify, RowProps } from './Stack.types';

const ALIGN: Record<FlexAlign, CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
};

const JUSTIFY: Record<FlexJustify, CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
  evenly: 'space-evenly',
};

export function Row({ children, gap, align, justify, wrap, testID }: RowProps) {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'row',
    flexWrap: wrap ? 'wrap' : undefined,
    gap,
    alignItems: align ? ALIGN[align] : undefined,
    justifyContent: justify ? JUSTIFY[justify] : undefined,
  };
  return (
    <div data-testid={testID} style={style}>
      {children}
    </div>
  );
}
