import React, { useState, useEffect, useRef, FunctionComponent, useImperativeHandle, forwardRef, RefAttributes } from 'react';
import * as Babel from '@babel/standalone';
import vm from 'vm';
import { ErrorBoundary } from './ErrorBoundary';
import { Frame } from './Frame';

const module = __non_webpack_require__('module') as typeof import('module');
const fs = __non_webpack_require__('fs') as typeof import('fs');

let cache: Record<string, Record<string, unknown> | undefined> = {};

const runCode = (requirePath: string | undefined, code: string) => {
  const startTime = new Date().getTime();
  console.log('loading...', requirePath)
  const moduleRequire = requirePath ? module.createRequire(requirePath) : __non_webpack_require__;
  let moduleExports: any = {};
  let exports: any = {};
  try {
    vm.runInNewContext(code, { process, module: moduleExports, exports, require: (name: string) => {
      if (name === 'react') return require('react');
      if (name === 'react-dom') return require('react-dom');
      
      if ((requirePath || '') in cache && name in cache[requirePath || '']!) {
        return cache[requirePath || '']![name];
      }

      const subRequirePath = moduleRequire.resolve(name);
      const codeExports = runCode(subRequirePath, Babel.transform(fs.readFileSync(subRequirePath, { encoding: 'utf-8' }), { presets: ['es2015', 'react'] }).code!);
      cache[requirePath || ''] = cache[requirePath || ''] || {};
      cache[requirePath || '']![name] = codeExports;
      return codeExports;
    }});
  } catch (error) {
    console.log('error file', requirePath, error)
    throw error;
  }
  const endTime = new Date().getTime();
  console.log('loaded', requirePath, endTime - startTime);
  return moduleExports.exports || exports;
};

export const getComponentElementFromEvent = (
  event: React.MouseEvent<HTMLDivElement, MouseEvent>,
  componentView: BabelComponentViewRef | null
) => {
  const boundingBox = (event.target as HTMLDivElement).getBoundingClientRect();
  const x = event.clientX - boundingBox.x;
  const y = event.clientY - boundingBox.y;
  return componentView?.getElementAtPoint(x, y);
};

export interface BabelComponentViewRef {
  getElementAtPoint: (x: number, y: number) => Element | null | undefined;
}

export const BabelComponentView: FunctionComponent<{code: string, filePath?: string} & RefAttributes<BabelComponentViewRef>> = forwardRef(({ code, filePath }, ref) => {
  const errorBoundary = useRef<ErrorBoundary>(null);
  const [CompiledElement, setCompiledElement] = useState<any>();

  useEffect(() => {
    cache = {};
  }, [filePath])

  useEffect(() => {
    if (code) {
      try {
        const result = Babel.transform(code, { presets: ['es2015', 'react'] });
        if (result.code !== undefined && result.code !== null) {
          const codeExports = runCode(filePath, result.code);
          setCompiledElement(() => Object.values(codeExports).find((e): e is Function => typeof e === 'function'));

          if (errorBoundary.current?.hasError()) {
            errorBoundary.current.resetError();
          }
        }
      } catch (e) {
        console.log(e);
      }
    }
  }, [filePath, code]);

  const frame = useRef<HTMLIFrameElement>(null);
  useImperativeHandle(ref, () => ({
    getElementAtPoint(x, y) {
      return frame.current?.contentDocument?.elementFromPoint(x, y);
    }
  }));

  return (
    <Frame ref={frame} className="flex-1">
      <ErrorBoundary
        ref={errorBoundary}
        onError={(error, errorInfo) => {
          console.log(error, errorInfo);
        }}>
        {CompiledElement && <CompiledElement /> }
      </ErrorBoundary>
    </Frame>
  );
});
