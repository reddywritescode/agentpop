import type { Meta, StoryObj } from "@storybook/react";
import { Plus, ArrowRight, Trash2 } from "lucide-react";
import { Button } from "./button";

const meta = {
  title: "Primitives/Button",
  component: Button,
  parameters: { layout: "centered" },
  args: { children: "New sandbox" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = { args: { variant: "primary" } };
export const Secondary: Story = { args: { variant: "secondary", children: "Cancel" } };
export const Outline: Story = { args: { variant: "outline", children: "Filter" } };
export const Ghost: Story = { args: { variant: "ghost", children: "Dismiss" } };
export const Danger: Story = { args: { variant: "danger", children: "Destroy sandbox" } };

export const WithLeadingIcon: Story = {
  args: { variant: "primary", leadingIcon: <Plus />, children: "New sandbox" },
};

export const WithTrailingIcon: Story = {
  args: { variant: "secondary", trailingIcon: <ArrowRight />, children: "Continue" },
};

export const Loading: Story = { args: { loading: true, children: "Creating…" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="primary" leadingIcon={<Plus />}>
        New sandbox
      </Button>
      <Button variant="secondary">Cancel</Button>
      <Button variant="outline">Filter</Button>
      <Button variant="ghost">Dismiss</Button>
      <Button variant="danger" leadingIcon={<Trash2 />}>
        Destroy
      </Button>
      <Button variant="link">View docs</Button>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
