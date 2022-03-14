import {
  CustomComponentConfig,
  CustomComponentDefinition,
} from "../../types/paint";

function materialUIComponentDef(name: string): CustomComponentDefinition {
  return {
    name,
    import: {
      name,
      path: `@material-ui/core/${name}`,
      isDefault: true,
    },
  };
}

export const materialUiComponents: CustomComponentConfig = {
  // todo themes?
  name: "Material-UI",
  installed: (project) =>
    project.config.isPackageInstalled("@material-ui/core"),
  install: (project, installPackage) => installPackage("@material-ui/core"),
  components: [
    materialUIComponentDef("Button"), // todo somehow handle events
    materialUIComponentDef("ButtonGroup"), // todo add buttons in this by default
    materialUIComponentDef("Checkbox"), // todo support form control label
    // materialUIComponentDef("RadioGroup"), // todo support with form control label
    // materialUIComponentDef("Select"), // todo support menu items
    materialUIComponentDef("Slider"), // todo support value attributes
    materialUIComponentDef("Switch"), // todo support form control label
    materialUIComponentDef("TextField"),
    // materialUIComponentDef("BottomNavigation"), // todo support BottomNavigationAction
    materialUIComponentDef("Breadcrumbs"), // todo add links by default
    // materialUIComponentDef("Drawer"), // todo support
    // materialUIComponentDef("Menu"), // todo support with anchorEl
    // materialUIComponentDef("Stepper"), // todo support with Step/StepLabel
    // materialUIComponentDef("Tabs"), // todo add Tab by default, may need state support to show/hide content
    materialUIComponentDef("AppBar"), // todo support position, add Toolbar by default
    materialUIComponentDef("Paper"), // todo support elevation
    // materialUIComponentDef("Card"), // todo support CardContent/CardActions
    // materialUIComponentDef("ExpansionPanel"), // todo support ExpansionPanelSummary/ExpansionPanelDetails
    materialUIComponentDef("CircularProgress"), // todo support color
    materialUIComponentDef("LinearProgress"), // todo support color
    // materialUIComponentDef("SimpleDialog"), // todo support
    // materialUIComponentDef("Snackbar"), // todo support
    // materialUIComponentDef("Backdrop"), // todo support
    materialUIComponentDef("Avatar"), // todo support image/text
    // materialUIComponentDef("Badge"), // todo support
    materialUIComponentDef("Chip"), // todo support label/icon/avatar
    materialUIComponentDef("Divider"),
    // materialUIComponentDef("List"), // todo support ListItem
    // materialUIComponentDef("Table"), // todo support TableContainer/TableHead/TableRow/TableCell
    // materialUIComponentDef("Tooltip"), // todo support
  ],
};
