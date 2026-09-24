import { Menu, MenuItem, ListItemIcon, ListItemText, styled } from "@mui/material";
import {
	SwapHoriz,
	Delete,
	NotificationsActive,
	NotificationsOff,
	NotInterested
} from "@mui/icons-material";
import React, { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import ContactService from "../../services/contacts";
import { Can } from "../Can";
import ConfirmationModal from "../ConfirmationModal";
import TransferTicketModal from "../TransferTicketModal";

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
	padding: theme.spacing(1, 2),
	"&:hover": {
		backgroundColor: theme.palette.grey[100],
	},
}));

const MenuItemIcon = styled(ListItemIcon)(({ theme }) => ({
	minWidth: "40px",
	color: theme.palette.primary.main,
}));

const TicketOptionsMenu = ({ ticket, menuOpen, handleClose, anchorEl }) => {
	const { t } = useTranslation();
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);
	const [messageHandling, setMessageHandling] = useState(
		ticket?.contact?.messageHandling || "normal"
	);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleDeleteTicket = async () => {
		try {
			await api.delete(`/tickets/${ticket.id}`);
		} catch (err) {
			toastError(err);
		}
	};

	/**
	 * Manejo de mensajes del contacto de este chat: normal / silenciar / ignorar.
	 * Quien no sea admin recibe 403 del backend (la acción descarta mensajes),
	 * así que el error se muestra tal cual.
	 */
	const handleMessageHandling = async (valor) => {
		const anterior = messageHandling;
		setMessageHandling(valor);
		handleClose();

		try {
			await ContactService.updateMessageHandling(ticket.contact.id, valor);
			toast.success(
				t("contactModal.messageHandling.saved", {
					defaultValue: "Preferencia de mensajes guardada."
				})
			);
		} catch (err) {
			setMessageHandling(anterior);
			toastError(err);
		}
	};

	const handleOpenConfirmationModal = e => {
		setConfirmationOpen(true);
		handleClose();
	};

	const handleOpenTransferModal = e => {
		setTransferTicketModalOpen(true);
		handleClose();
	};

	const handleCloseTransferTicketModal = () => {
		if (isMounted.current) {
			setTransferTicketModalOpen(false);
		}
	};

	return (
		<>
			<Menu
				id="menu-appbar"
				anchorEl={anchorEl}
				anchorOrigin={{
					vertical: "bottom",
					horizontal: "right",
				}}
				keepMounted
				transformOrigin={{
					vertical: "top",
					horizontal: "right",
				}}
				open={menuOpen}
				onClose={handleClose}
			>
				{!ticket?.contact?.isGroup && (
					<StyledMenuItem
						selected={messageHandling === "normal"}
						onClick={() => handleMessageHandling("normal")}
					>
						<MenuItemIcon>
							<NotificationsActive />
						</MenuItemIcon>
						<ListItemText
							primary={t("contactModal.messageHandling.normalShort", {
								defaultValue: "Recibir normalmente"
							})}
						/>
					</StyledMenuItem>
				)}
				{!ticket?.contact?.isGroup && (
					<StyledMenuItem
						selected={messageHandling === "silent"}
						onClick={() => handleMessageHandling("silent")}
					>
						<MenuItemIcon>
							<NotificationsOff />
						</MenuItemIcon>
						<ListItemText
							primary={t("contactModal.messageHandling.silentShort", {
								defaultValue: "Silenciar (sin no leídos)"
							})}
						/>
					</StyledMenuItem>
				)}
				{!ticket?.contact?.isGroup && (
					<StyledMenuItem
						selected={messageHandling === "ignore"}
						onClick={() => handleMessageHandling("ignore")}
					>
						<MenuItemIcon>
							<NotInterested />
						</MenuItemIcon>
						<ListItemText
							primary={t("contactModal.messageHandling.ignoreShort", {
								defaultValue: "Ignorar (no crear ticket)"
							})}
						/>
					</StyledMenuItem>
				)}
				<StyledMenuItem onClick={handleOpenTransferModal}>
					<MenuItemIcon>
						<SwapHoriz />
					</MenuItemIcon>
					<ListItemText primary={t("ticketOptionsMenu.transfer")} />
				</StyledMenuItem>
				<Can
					role={user.profile}
					perform="ticket-options:deleteTicket"
					yes={() => (
						<StyledMenuItem onClick={handleOpenConfirmationModal}>
							<MenuItemIcon>
								<Delete />
							</MenuItemIcon>
							<ListItemText primary={t("ticketOptionsMenu.delete")} />
						</StyledMenuItem>
					)}
				/>
			</Menu>
			<ConfirmationModal
				title={`${t("ticketOptionsMenu.confirmationModal.title")}${ticket.id
					} ${t("ticketOptionsMenu.confirmationModal.titleFrom")} ${ticket.contact.name
					}?`}
				open={confirmationOpen}
				onClose={setConfirmationOpen}
				onConfirm={handleDeleteTicket}
			>
				{t("ticketOptionsMenu.confirmationModal.message")}
			</ConfirmationModal>
			<TransferTicketModal
				modalOpen={transferTicketModalOpen}
				onClose={handleCloseTransferTicketModal}
				ticketid={ticket.id}
			/>
		</>
	);
};

export default TicketOptionsMenu;
