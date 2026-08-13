import {
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	TextField,
	Typography,
	Box,
	Divider,
	InputAdornment
} from "@mui/material";
import { QrCode, Phone } from "@mui/icons-material";
import React, { useState } from "react";

const ConnectionMethodModal = ({ open, onClose, onSelectMethod, whatsAppId }) => {
	const [phoneNumber, setPhoneNumber] = useState("");
	const [phoneError, setPhoneError] = useState("");

	const handlePhoneChange = (event) => {
		const value = event.target.value.replace(/\D/g, ""); 
		setPhoneNumber(value);
		setPhoneError("");
	};

	const validatePhoneNumber = (phone) => {
		if (!phone) {
			return "El número de teléfono es obligatorio";
		}
		if (phone.length < 10) {
			return "Número demasiado corto";
		}
		if (phone.length > 15) {
			return "Número demasiado largo";
		}
		if (phone.length === 11 && !phone.startsWith("55")) {
			return "Para números, usá el formato: 5491199999999";
		}
		return "";
	};

	const handlePairingCodeSubmit = () => {
		const error = validatePhoneNumber(phoneNumber);
		if (error) {
			setPhoneError(error);
			return;
		}

		let formattedNumber = phoneNumber;
		if (phoneNumber.length === 11 && !phoneNumber.startsWith("55")) {
			formattedNumber = "55" + phoneNumber;
		}

		onSelectMethod("pairing", formattedNumber);
		handleClose();
	};

	const handleQRCodeSelect = () => {
		onSelectMethod("qrcode");
		handleClose();
	};

	const handleClose = () => {
		setPhoneNumber("");
		setPhoneError("");
		onClose();
	};

	const formatPhoneDisplay = (phone) => {
		if (phone.length === 11) {
			return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
		}
		if (phone.length === 13 && phone.startsWith("55")) {
			return `+55 (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`;
		}
		return phone;
	};

	return (
		<Dialog 
			open={open} 
			onClose={handleClose} 
			maxWidth="sm" 
			fullWidth
			PaperProps={{
				sx: {
					borderRadius: 2,
					minHeight: 400
				}
			}}
		>
			<DialogTitle sx={{ textAlign: "center", pb: 1 }}>
				<Typography variant="h6" component="div" fontWeight={600}>
					Elegí el Método de Conexión
				</Typography>
				<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
					Elegí cómo querés conectar tu WhatsApp
				</Typography>
			</DialogTitle>

			<DialogContent sx={{ px: 3, py: 2 }}>
				<Box sx={{ mb: 3 }}>
					<Button
						variant="outlined"
						fullWidth
						size="large"
						startIcon={<QrCode />}
						onClick={handleQRCodeSelect}
						sx={{
							py: 2,
							borderRadius: 2,
							textTransform: "none",
							fontSize: "1rem",
							fontWeight: 500,
							borderColor: "primary.main",
							"&:hover": {
								backgroundColor: "primary.light",
								color: "white"
							}
						}}
					>
						<Box sx={{ textAlign: "left", flex: 1 }}>
							<Typography variant="subtitle1" fontWeight={600}>
								QR Code
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Escaneá el código QR con tu celular
							</Typography>
						</Box>
					</Button>
				</Box>

				<Divider sx={{ my: 2 }}>
					<Typography variant="body2" color="text.secondary">
						OU
					</Typography>
				</Divider>

				<Box>
					<Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
						<Phone sx={{ mr: 1, verticalAlign: "middle" }} />
						Código de Vinculación
					</Typography>
					<Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
						Ingresá tu número de teléfono para recibir un código de vinculación
					</Typography>
					
					<TextField
						fullWidth
						label="Número de Teléfono"
						placeholder="5511999999999"
						value={phoneNumber}
						onChange={handlePhoneChange}
						error={!!phoneError}
						helperText={phoneError || "Formato: código del país + DDD + número (ej: 5491199999999)"}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<Phone color="action" />
								</InputAdornment>
							),
						}}
						sx={{ mb: 2 }}
					/>

					{phoneNumber && !phoneError && (
						<Box sx={{ p: 2, backgroundColor: "grey.50", borderRadius: 1, mb: 2 }}>
							<Typography variant="body2" color="text.secondary">
								Número formateado: <strong>{formatPhoneDisplay(phoneNumber)}</strong>
							</Typography>
						</Box>
					)}

					<Button
						variant="contained"
						fullWidth
						size="large"
						onClick={handlePairingCodeSubmit}
						disabled={!phoneNumber || !!phoneError}
						sx={{
							py: 1.5,
							borderRadius: 2,
							textTransform: "none",
							fontSize: "1rem",
							fontWeight: 500
						}}
					>
						Generar Código de Vinculación
					</Button>
				</Box>
			</DialogContent>

			<DialogActions sx={{ px: 3, pb: 3 }}>
				<Button 
					onClick={handleClose} 
					color="inherit"
					sx={{ textTransform: "none" }}
				>
					Cancelar
				</Button>
			</DialogActions>
		</Dialog>
	);
};

export default ConnectionMethodModal;
