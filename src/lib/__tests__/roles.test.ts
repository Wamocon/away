import { describe, it, expect } from 'vitest';
import { 
  isAdmin, 
  isApprover, 
  canApprove, 
  canManageUsers, 
  ROLE_LABELS, 
  ROLE_COLORS 
} from '../roles';

describe('roles utility helpers', () => {
  describe('isAdmin', () => {
    it('should return true for admin role', () => {
      expect(isAdmin('admin')).toBe(true);
    });
    it('should return false for other roles', () => {
      expect(isAdmin('approver')).toBe(false);
      expect(isAdmin('employee')).toBe(false);
      expect(isAdmin(null as any)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
    });
  });

  describe('isApprover', () => {
    it('should return true for approver and admin roles', () => {
      expect(isApprover('approver')).toBe(true);
      expect(isApprover('admin')).toBe(true);
    });
    it('should return false for employee role', () => {
      expect(isApprover('employee')).toBe(false);
    });
  });

  describe('canApprove', () => {
    it('should return true if user is admin or approver', () => {
      expect(canApprove('admin')).toBe(true);
      expect(canApprove('approver')).toBe(true);
    });
    it('should return false for employee', () => {
      expect(canApprove('employee')).toBe(false);
    });
  });

  describe('canManageUsers', () => {
    it('should only return true for admin', () => {
      expect(canManageUsers('admin')).toBe(true);
      expect(canManageUsers('approver')).toBe(false);
      expect(canManageUsers('employee')).toBe(false);
    });
  });

  describe('constants', () => {
    it('should have correct labels', () => {
      expect(ROLE_LABELS.admin).toBe('Administrator');
      expect(ROLE_LABELS.approver).toBe('Genehmiger');
      expect(ROLE_LABELS.employee).toBe('Mitarbeiter');
    });

    it('should have defined colors', () => {
      expect(ROLE_COLORS.admin).toBeDefined();
      expect(ROLE_COLORS.approver).toBeDefined();
      expect(ROLE_COLORS.employee).toBeDefined();
    });
  });
});
