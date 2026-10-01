import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, CircularProgress, Tooltip } from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import { toast } from "react-toastify";
import api from "../../services/api";
import { disableMobileMode, enableMobileMode, isNativeApp, refreshMobilePushRegistration } from "../../services/pushNotifications";

const MobileModeControl = () => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.get("/push-notifications/status")
      .then(async ({ data }) => {
        if (!mounted) return;
        setEnabled(Boolean(data.enabled));
        if (data.enabled && isNativeApp()) {
          await refreshMobilePushRegistration().catch(error => {
            console.error("No se pudo actualizar el registro de notificaciones móviles:", error);
          });
        }
      })
      .catch(error => console.error("No se pudo cargar el modo de notificaciones móviles:", error));
    return () => { mounted = false; };
  }, []);

  const toggleMode = async () => {
    setLoading(true);
    try {
      if (enabled) {
        await disableMobileMode();
        setEnabled(false);
        toast.info(t("mobileNotifications.paused"));
        return;
      }

      const result = await enableMobileMode();
      if (!result.ready) {
        toast.info(result.reason || t("mobileNotifications.activateError"));
        return;
      }
      if (!isNativeApp()) {
        toast.info(t("mobileNotifications.webModeInfo"));
      }
      setEnabled(true);
      toast.success(t("mobileNotifications.enabled"));
    } catch (error) {
      const message = error?.response?.data?.error || error.message || t("mobileNotifications.changeError");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title={enabled ? t("mobileNotifications.pause") : t("mobileNotifications.away")}>
      <span>
        <Button
          size="small"
          color={enabled ? "secondary" : "inherit"}
          variant={enabled ? "contained" : "outlined"}
          onClick={toggleMode}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : enabled ? <NotificationsActiveIcon /> : <NotificationsOffIcon />}
          sx={{ minWidth: 40, whiteSpace: "nowrap", px: { xs: 1, sm: 1.5 } }}
        >
          <span className="mobile-mode-label">{enabled ? t("mobileNotifications.active") : t("mobileNotifications.awayShort")}</span>
        </Button>
      </span>
    </Tooltip>
  );
};

export default MobileModeControl;
