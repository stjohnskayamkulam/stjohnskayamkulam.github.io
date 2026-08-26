/**
 * `/my-class` and `/class/:year` were real pages before the directory absorbed
 * them, so links to them are already out in the world and must keep working.
 */
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthContext, type AuthContextValue } from "@/contexts/authContext";
import { ClassYearRedirect, MyClassRedirect } from "./ClassRedirects";

function Probe() {
  const { pathname, search } = useLocation();
  return <p>Landed on {pathname + search}</p>;
}

function renderAt(path: string, gradYear?: number) {
  const auth = {
    session: gradYear
      ? { account: { uid: "me" }, profile: { gradYear } }
      : null,
    loading: false,
  } as unknown as AuthContextValue;

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/alumni" element={<Probe />} />
          <Route path="/my-class" element={<MyClassRedirect />} />
          <Route path="/class/:year" element={<ClassYearRedirect />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

const landing = () => screen.getByText(/^Landed on/).textContent;

describe("MyClassRedirect", () => {
  it("lands on the directory pre-filtered to the member\u2019s year", () => {
    renderAt("/my-class", 2001);
    expect(landing()).toBe("Landed on /alumni?year=2001");
  });

  it("sends a member with no recorded year to the directory, which offers to set one", () => {
    renderAt("/my-class");
    expect(landing()).toBe("Landed on /alumni");
  });
});

describe("ClassYearRedirect", () => {
  it("translates an old class link into a year filter", () => {
    renderAt("/class/1998");
    expect(landing()).toBe("Landed on /alumni?year=1998");
  });

  it("drops a nonsense year instead of filtering on it", () => {
    renderAt("/class/banana");
    expect(landing()).toBe("Landed on /alumni");
  });
});
