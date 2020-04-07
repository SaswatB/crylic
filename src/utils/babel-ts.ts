import { parse as babelParse } from "@babel/parser";
import getBabelOptions, { Overrides } from "recast/parsers/_babel_options";

export const babelTsParser = {
  parse(source: string, options?: Overrides) {
    const babelOptions = getBabelOptions(options);
    babelOptions.plugins.push("jsx", "typescript");
    return babelParse(source, babelOptions);
  }
};
