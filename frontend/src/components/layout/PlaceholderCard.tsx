import { Box, Paper, Typography } from "@mui/material";

type PlaceholderCardProps = {
  title: string;
  description: string;
};

/** Shared shell for pages whose content isn't built yet. */
export default function PlaceholderCard({
  title,
  description,
}: PlaceholderCardProps) {
  return (
    <Paper variant="outlined" sx={{ border: 1, borderColor: "divider" }}>
      <Box sx={{ px: 3, py: 2.5, borderBottom: 1, borderColor: "divider" }}>
        <Typography
          variant="subtitle2"
          sx={{ letterSpacing: 0.6, textTransform: "uppercase" }}
        >
          {title}
        </Typography>
      </Box>
      <Box sx={{ px: 3, py: 8, textAlign: "center" }}>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Paper>
  );
}
