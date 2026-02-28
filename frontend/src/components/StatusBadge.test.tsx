import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatusBadge } from "./StatusBadge"

describe("StatusBadge", () => {
  it("renders the status label", () => {
    render(<StatusBadge status="DELIVERED" />)
    expect(screen.getByText("DELIVERED")).toBeInTheDocument()
  })

  it("renders status with underscore replaced by space", () => {
    render(<StatusBadge status="IN_TRANSIT" />)
    expect(screen.getByText("IN TRANSIT")).toBeInTheDocument()
  })

  it("applies custom className", () => {
    const { container } = render(
      <StatusBadge status="BOOKED" className="custom-class" />
    )
    const badge = container.querySelector(".custom-class")
    expect(badge).toBeInTheDocument()
  })

  it("renders for CANCELLED status", () => {
    render(<StatusBadge status="CANCELLED" />)
    expect(screen.getByText("CANCELLED")).toBeInTheDocument()
  })
})