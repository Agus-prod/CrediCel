"use client";

import { useState } from "react";

import { roleRequiresBranch } from "@/lib/team-access";
import { inviteMember } from "./actions";

type Option = {
  readonly id: string;
  readonly label: string;
};

type RoleOption = {
  readonly label: string;
  readonly name: string;
};

export function InviteMemberForm({
  branches,
  roles,
}: {
  readonly branches: readonly Option[];
  readonly roles: readonly RoleOption[];
}) {
  const [roleName, setRoleName] = useState("");
  const [branchId, setBranchId] = useState("");
  const requiresBranch = roleRequiresBranch(roleName);
  const hasRequiredBranch = !requiresBranch || Boolean(branchId);

  return (
    <form action={inviteMember} className="form">
      <div className="field">
        <label htmlFor="full_name">Nombre completo</label>
        <input autoComplete="name" id="full_name" name="full_name" required />
      </div>
      <div className="field">
        <label htmlFor="email">Correo</label>
        <input autoComplete="email" id="email" name="email" type="email" required />
      </div>
      <div className="field">
        <label htmlFor="role_name">Rol</label>
        <select
          id="role_name"
          name="role_name"
          onChange={(event) => {
            const nextRole = event.target.value;
            setRoleName(nextRole);
            if (!roleRequiresBranch(nextRole)) {
              setBranchId("");
            } else if (!branchId && branches.length === 1) {
              setBranchId(branches[0]?.id ?? "");
            }
          }}
          required
          value={roleName}
        >
          <option value="">Seleccionar</option>
          {roles.map((role) => (
            <option key={role.name} value={role.name}>
              {role.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="branch_id">Tienda</label>
        <select
          aria-describedby="branch-help"
          disabled={!roleName || !requiresBranch}
          id="branch_id"
          name="branch_id"
          onChange={(event) => setBranchId(event.target.value)}
          required={requiresBranch}
          value={branchId}
        >
          <option value="">
            {!roleName
              ? "Selecciona primero un rol"
              : requiresBranch
                ? "Selecciona una tienda"
                : "Todas las tiendas"}
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.label}
            </option>
          ))}
        </select>
        <span className="field-help" id="branch-help">
          {requiresBranch
            ? "Este rol no podrá ingresar sin una tienda asignada."
            : roleName
              ? "Este rol trabaja con alcance de toda la organización."
              : "El alcance se ajustará automáticamente según el rol."}
        </span>
      </div>
      {requiresBranch && branches.length === 0 ? (
        <div className="error form-wide" role="alert">
          Crea una tienda activa antes de invitar a este rol.
        </div>
      ) : null}
      <div className="form-actions">
        <button
          className="button"
          disabled={!roleName || !hasRequiredBranch}
          type="submit"
        >
          Crear invitación
        </button>
      </div>
    </form>
  );
}
