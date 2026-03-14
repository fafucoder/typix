import {Vidu, Kling, ModelIcon as LobeModelIcon, ProviderIcon as LobeProviderIcon } from "@lobehub/icons";
import type { ProviderIconProps as LobeProviderIconProps } from "@lobehub/icons/es/features/ProviderIcon";

export default function ProviderIcon(props: LobeProviderIconProps) {
	if (props.provider?.toLocaleLowerCase() === "flux") {
		return <LobeModelIcon model={props.provider} {...props} />;
	}
	if (props.provider?.toLocaleLowerCase() === "vidu") {
		return <Vidu.Color {...props} />;
	}
	if (props.provider?.toLocaleLowerCase() === "kling") {
		return <Kling.Color {...props} />;
	}
	return <LobeProviderIcon {...props} />;
}
