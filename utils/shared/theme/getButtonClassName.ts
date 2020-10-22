/* Copied from https://github.com/segmentio/evergreen/blob/master/src/theme/src/default-theme/component-specific/getButtonClassName.js */
/* Orignal values are left as comments next to their overwritten value */

// @ts-nocheck
import { Themer } from "evergreen-ui/commonjs/themer";
import memoizeClassName from "evergreen-ui/commonjs/theme/src/default-theme/utils/memoizeClassName";
import scales from "evergreen-ui/commonjs/theme/src/default-theme/foundational-styles/scales";
import {
	getTextColorForIntent,
	getPrimaryButtonStylesForIntent,
} from "evergreen-ui/commonjs/theme/src/default-theme/helpers";
import { defaultControlStyles } from "evergreen-ui/commonjs/theme/src/default-theme/shared";

/**
 * Disabled styles are all the same for all buttons.
 */
const { disabled } = defaultControlStyles;

/**
 * Get button appearance.
 * @param {string} appearance - default, primary, minimal.
 * @param {string} intent - none, success, warning, danger.
 * @return {Object} the appearance of the button.
 */
const getButtonAppearance = (appearance, intent) => {
	switch (appearance) {
		case "primary": {
			const { linearGradient, focusColor } = getPrimaryButtonStylesForIntent(intent);
			return Themer.createButtonAppearance({
				disabled,
				base: {
					color: "white",
					backgroundColor: "white",
					backgroundImage: linearGradient.base,
					boxShadow: `inset 0 0 0 1px ${scales.neutral.N5A}, inset 0 -1px 1px 0 ${scales.neutral.N2A}`,
				},
				hover: {
					backgroundImage: linearGradient.hover,
				},
				focus: {
					boxShadow: `0 0 0 3px ${focusColor}, inset 0 0 0 1px ${scales.neutral.N4A}, inset 0 -1px 1px 0 ${scales.neutral.N5A}`,
				},
				active: {
					backgroundImage: linearGradient.active,
					boxShadow: `inset 0 0 0 1px ${scales.neutral.N4A}, inset 0 1px 1px 0 ${scales.neutral.N2A}`,
				},
				focusAndActive: {
					boxShadow: `0 0 0 3px ${focusColor}, inset 0 0 0 1px ${scales.neutral.N4A}, inset 0 1px 1px 0 ${scales.neutral.N2A}`,
				},
			});
		}

		case "minimal": {
			// const intentTextColor = getTextColorForIntent(intent, scales.blue.B9);
			const intentTextColor = getTextColorForIntent(intent);
			return Themer.createButtonAppearance({
				disabled,
				base: {
					color: intentTextColor,
					backgroundColor: "transparent",
				},
				hover: {
					backgroundColor: scales.neutral.N2A,
				},
				focus: {
					// boxShadow: `0 0 0 3px ${scales.blue.B5A}`,
					boxShadow: `0 0 0 3px ${scales.neutral.N8A}`,
				},
				active: {
					backgroundImage: "none",
					// backgroundColor: scales.blue.B3A,
					backgroundColor: scales.neutral.N3A,
				},
				focusAndActive: {},
			});
		}

		case "default":
		default: {
			const intentTextColor = getTextColorForIntent(intent);
			return Themer.createButtonAppearance({
				disabled,
				base: {
					color: intentTextColor,
					...defaultControlStyles.base,
				},
				hover: defaultControlStyles.hover,
				focus: defaultControlStyles.focus,
				active: defaultControlStyles.active,
				focusAndActive: defaultControlStyles.focusAndActive,
			});
		}
	}
};

/**
 * Get the className of a `Button`|`IconButton`.
 * @param {string} appearance - default, primary, minimal.
 * @param {Intent} intent - none, success, warning, danger.
 * @return {string} the appearance class name.
 */
export default memoizeClassName(getButtonAppearance);