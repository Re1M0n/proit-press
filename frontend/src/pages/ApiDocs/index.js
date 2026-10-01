import { styled } from "@mui/material/styles";
import React from "react";
import { getBackendUrl } from "../../services/serverConfig";

const Root = styled('div')(({ theme }) => ({
	display: "flex",
	alignItems: "stretch",
	padding: theme.spacing(1),
	height: 'calc(100vh - 80px)',
	overflow: 'hidden'
}));

const StyledIframe = styled('iframe')({
	border: 'none',
	width: '100%',
	height: '100%',
	minHeight: '600px'
});

const ApiDocs = () => {
	const urlapi = `${getBackendUrl()}/api-docs`;

	return (
		<Root>
			<StyledIframe 
				title="Documentación de la API" 
				src={urlapi}
				allow="fullscreen"
			/>
		</Root>
	);
};

export default ApiDocs;
