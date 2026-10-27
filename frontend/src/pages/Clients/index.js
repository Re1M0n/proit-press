import {
  Box,
  Button,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import { styled } from "@mui/material/styles";
import AddCircleOutline from "@mui/icons-material/AddCircleOutline";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import Edit from "@mui/icons-material/Edit";
import Search from "@mui/icons-material/Search";
import React, { useCallback, useEffect, useReducer, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import ConfirmationModal from "../../components/ConfirmationModal";
import ClientsModal from "../../components/ClientsModal";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import TableRowSkeleton from "../../components/TableRowSkeleton";
import Title from "../../components/Title";
import toastError from "../../errors/toastError";
import api from "../../services/api";
import openSocket from "../../services/socket-io";

const reducer = (state, action) => {
  if (action.type === "LOAD_CLIENTS") {
    const clients = action.payload;
    const nuevos = [];

    clients.forEach(client => {
      const index = state.findIndex(item => item.id === client.id);

      if (index !== -1) {
        state[index] = client;
      } else {
        nuevos.push(client);
      }
    });

    return [...state, ...nuevos];
  }

  if (action.type === "UPDATE_CLIENTS") {
    const client = action.payload;
    const index = state.findIndex(item => item.id === client.id);

    if (index !== -1) {
      state[index] = client;
      return [...state];
    }

    return [client, ...state];
  }

  if (action.type === "DELETE_CLIENT") {
    const clientId = action.payload;
    const index = state.findIndex(item => item.id === clientId);

    if (index !== -1) {
      state.splice(index, 1);
    }

    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const MainPaper = styled(Paper)(({ theme }) => ({
  flex: 1,
  padding: theme.spacing(2),
  margin: theme.spacing(1),
  overflowY: "scroll",
  ...theme.scrollbarStyles,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[1]
}));

const SearchContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  width: "100%",
  [theme.breakpoints.down("md")]: {
    marginBottom: theme.spacing(1)
  }
}));

const ButtonContainer = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(1),
  [theme.breakpoints.down("md")]: {
    marginTop: theme.spacing(1)
  }
}));

const Clients = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchParam, setSearchParam] = useState(
    () => new URLSearchParams(location.search).get("searchParam") || ""
  );
  const [subscriberFilter, setSubscriberFilter] = useState("");
  const [clients, dispatch] = useReducer(reducer, []);
  const [selectedClient, setSelectedClient] = useState(null);
  const [deletingClient, setDeletingClient] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  const fetchClients = useCallback(async () => {
    try {
      const { data } = await api.get("/clients", {
        params: {
          searchParam,
          pageNumber,
          ...(subscriberFilter ? { isSubscriber: subscriberFilter } : {})
        }
      });

      dispatch({ type: "LOAD_CLIENTS", payload: data.clients });
      setHasMore(data.hasMore);
      setLoading(false);
    } catch (err) {
      toastError(err, t);
      setLoading(false);
    }
  }, [searchParam, pageNumber, subscriberFilter, t]);

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam, subscriberFilter]);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(() => {
      fetchClients();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber, subscriberFilter, fetchClients]);

  useEffect(() => {
    const socket = openSocket();

    socket.on("client", data => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_CLIENTS", payload: data.client });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_CLIENT", payload: +data.client.id });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleSearch = event => {
    setSearchParam(event.target.value.toLowerCase());
  };

  const handleOpenClientModal = () => {
    setSelectedClient(null);
    setClientModalOpen(true);
  };

  const handleCloseClientModal = () => {
    setSelectedClient(null);
    setClientModalOpen(false);
  };

  const handleEditClient = client => {
    setSelectedClient(client);
    setClientModalOpen(true);
  };

  const handleDeleteClient = async clientId => {
    try {
      await api.delete(`/clients/${clientId}`);
      toast.success(t("clients.toasts.deleted"));
      dispatch({ type: "DELETE_CLIENT", payload: clientId });
    } catch (err) {
      toastError(err, t);
    }

    setDeletingClient(null);
    setSearchParam("");
    setPageNumber(1);
  };

  const handleScroll = e => {
    if (!hasMore || loading) return;

    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      setPageNumber(prevState => prevState + 1);
    }
  };

  return (
    <MainContainer>
      <ConfirmationModal
        title={t("clients.confirmationModal.deleteTitle")}
        open={confirmModalOpen}
        onClose={setConfirmModalOpen}
        onConfirm={() => handleDeleteClient(deletingClient.id)}
      >
        {t("clients.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <ClientsModal
        open={clientModalOpen}
        onClose={handleCloseClientModal}
        aria-labelledby="form-dialog-title"
        clientId={selectedClient && selectedClient.id}
      />

      <MainHeader>
        <Title>
          {t("clients.title")}{" "}
          {clients.length > 0 ? `(${clients.length})` : ""}
        </Title>

        {tab === 0 && (
          <MainHeaderButtonsWrapper>
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                alignItems: { xs: "flex-start", md: "center" },
                width: "100%",
                gap: 1
              }}
            >
              <SearchContainer>
                <TextField
                  placeholder={t("clients.searchPlaceholder")}
                  type="search"
                  fullWidth
                  size="small"
                  value={searchParam}
                  onChange={handleSearch}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="secondary" />
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    py: 0,
                    "& .MuiOutlinedInput-root": {
                      height: 40
                    }
                  }}
                />
              </SearchContainer>
              <ButtonContainer>
                <Tooltip title={t("clients.buttons.add")}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleOpenClientModal}
                    sx={{
                      minWidth: { xs: "100%", md: "auto" },
                      height: 40
                    }}
                  >
                    <AddCircleOutline />
                  </Button>
                </Tooltip>
              </ButtonContainer>
            </Box>
          </MainHeaderButtonsWrapper>
        )}
      </MainHeader>

      <Tabs
        value={tab}
        onChange={(e, value) => setTab(value)}
        indicatorColor="primary"
        textColor="primary"
        sx={{ marginLeft: 1 }}
      >
        <Tab label={t("clients.tabs.clients")} />
        <Tab label={t("clients.tabs.messages")} />
      </Tabs>

      {tab === 0 && (
        <>
          <Box sx={{ display: "flex", gap: 1, margin: 1, maxWidth: 320 }}>
            <FormControl size="small" fullWidth>
              <Select
                value={subscriberFilter}
                displayEmpty
                onChange={e => setSubscriberFilter(e.target.value)}
              >
                <MenuItem value="">{t("clients.filters.all")}</MenuItem>
                <MenuItem value="true">{t("clients.filters.subscribers")}</MenuItem>
                <MenuItem value="false">
                  {t("clients.filters.nonSubscribers")}
                </MenuItem>
              </Select>
            </FormControl>
          </Box>

          <MainPaper onScroll={handleScroll}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell align="center">{t("clients.table.name")}</TableCell>
                  <TableCell align="center">
                    {t("clients.table.subscriber")}
                  </TableCell>
                  <TableCell align="center">
                    {t("clients.table.contacts")}
                  </TableCell>
                  <TableCell align="center">
                    {t("clients.table.actions")}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map(client => (
                  <TableRow key={client.id}>
                    <TableCell align="center">{client.name}</TableCell>
                    <TableCell align="center">
                      <Chip
                        size="small"
                        color={client.isSubscriber ? "primary" : "default"}
                        label={
                          client.isSubscriber
                            ? t("clients.filters.subscribers")
                            : t("clients.filters.nonSubscribers")
                        }
                      />
                    </TableCell>
                    <TableCell align="center">
                      {t("clients.table.contactsCount", {
                        count: client.contactsCount || 0,
                        external: client.externalContactsCount || 0
                      })}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title={t("clients.buttons.edit")}>
                        <IconButton
                          size="small"
                          onClick={() => handleEditClient(client)}
                        >
                          <Edit color="secondary" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("clients.buttons.delete")}>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setConfirmModalOpen(true);
                            setDeletingClient(client);
                          }}
                        >
                          <DeleteOutline color="secondary" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}

                {loading && <TableRowSkeleton columns={4} />}
              </TableBody>
            </Table>
          </MainPaper>
        </>
      )}

      {tab === 1 && (
        <MainPaper>
          <Typography variant="body2">
            {t("clients.messages.comingSoon")}
          </Typography>
        </MainPaper>
      )}
    </MainContainer>
  );
};

export default Clients;
