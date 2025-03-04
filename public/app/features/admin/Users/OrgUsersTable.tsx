import React, { useEffect, useMemo, useState } from 'react';

import { OrgRole } from '@grafana/data';
import { selectors as e2eSelectors } from '@grafana/e2e-selectors';
import {
  Avatar,
  Box,
  Button,
  CellProps,
  Column,
  ConfirmModal,
  FetchDataFunc,
  Icon,
  InteractiveTable,
  Pagination,
  Stack,
  Tag,
  Tooltip,
} from '@grafana/ui';
import { UserRolePicker } from 'app/core/components/RolePicker/UserRolePicker';
import { fetchRoleOptions } from 'app/core/components/RolePicker/api';
import { TagBadge } from 'app/core/components/TagFilter/TagBadge';
import config from 'app/core/config';
import { contextSrv } from 'app/core/core';
import { AccessControlAction, OrgUser, Role } from 'app/types';

import { OrgRolePicker } from '../OrgRolePicker';

type Cell<T extends keyof OrgUser = keyof OrgUser> = CellProps<OrgUser, OrgUser[T]>;

const disabledRoleMessage = `This user's role is not editable because it is synchronized from your auth provider.
Refer to the Grafana authentication docs for details.`;

const getBasicRoleDisabled = (user: OrgUser) => {
  let basicRoleDisabled = !contextSrv.hasPermissionInMetadata(AccessControlAction.OrgUsersWrite, user);
  let authLabel = Array.isArray(user.authLabels) && user.authLabels.length > 0 ? user.authLabels[0] : '';
  // A GCom specific feature toggle for role locking has been introduced, as the previous implementation had a bug with locking down external users synced through GCom (https://github.com/grafana/grafana/pull/72044)
  // Remove this conditional once FlagGcomOnlyExternalOrgRoleSync feature toggle has been removed
  if (authLabel !== 'grafana.com' || config.featureToggles.gcomOnlyExternalOrgRoleSync) {
    const isUserSynced = user?.isExternallySynced;
    basicRoleDisabled = isUserSynced || basicRoleDisabled;
  }

  return basicRoleDisabled;
};

const selectors = e2eSelectors.pages.UserListPage.UsersListPage;

export interface Props {
  users: OrgUser[];
  orgId?: number;
  onRoleChange: (role: OrgRole, user: OrgUser) => void;
  onRemoveUser: (user: OrgUser) => void;
  fetchData?: FetchDataFunc<OrgUser>;
  changePage: (page: number) => void;
  page: number;
  totalPages: number;
  rolesLoading?: boolean;
}

export const OrgUsersTable = ({
  users,
  orgId,
  onRoleChange,
  onRemoveUser,
  fetchData,
  changePage,
  page,
  totalPages,
  rolesLoading,
}: Props) => {
  const [userToRemove, setUserToRemove] = useState<OrgUser | null>(null);
  const [roleOptions, setRoleOptions] = useState<Role[]>([]);

  useEffect(() => {
    async function fetchOptions() {
      try {
        if (contextSrv.hasPermission(AccessControlAction.ActionRolesList)) {
          let options = await fetchRoleOptions(orgId);
          setRoleOptions(options);
        }
      } catch (e) {
        console.error('Error loading options');
      }
    }
    if (contextSrv.licensedAccessControlEnabled()) {
      fetchOptions();
    }
  }, [orgId]);

  const columns: Array<Column<OrgUser>> = useMemo(
    () => [
      {
        id: 'avatarUrl',
        header: '',
        cell: ({ cell: { value } }: Cell<'avatarUrl'>) => value && <Avatar src={value} alt="User avatar" />,
      },
      {
        id: 'login',
        header: 'Login',
        cell: ({ cell: { value } }: Cell<'login'>) => <div>{value}</div>,
        sortType: 'string',
      },
      {
        id: 'email',
        header: 'Email',
        cell: ({ cell: { value } }: Cell<'email'>) => value,
        sortType: 'string',
      },
      {
        id: 'name',
        header: 'Name',
        cell: ({ cell: { value } }: Cell<'name'>) => value,
        sortType: 'string',
      },
      {
        id: 'lastSeenAtAge',
        header: 'Last active',
        cell: ({ cell: { value } }: Cell<'lastSeenAtAge'>) => value,
        sortType: (a, b) => new Date(a.original.lastSeenAt).getTime() - new Date(b.original.lastSeenAt).getTime(),
      },
      {
        id: 'role',
        header: 'Role',
        cell: ({ cell: { value }, row: { original } }: Cell<'role'>) => {
          const basicRoleDisabled = getBasicRoleDisabled(original);
          return contextSrv.licensedAccessControlEnabled() ? (
            <UserRolePicker
              userId={original.userId}
              roles={original.roles || []}
              isLoading={rolesLoading}
              orgId={orgId}
              roleOptions={roleOptions}
              basicRole={value}
              onBasicRoleChange={(newRole) => onRoleChange(newRole, original)}
              basicRoleDisabled={basicRoleDisabled}
              basicRoleDisabledMessage={disabledRoleMessage}
              width={40}
            />
          ) : (
            <OrgRolePicker
              aria-label="Role"
              value={value}
              disabled={basicRoleDisabled}
              onChange={(newRole) => onRoleChange(newRole, original)}
            />
          );
        },
      },
      {
        id: 'info',
        header: '',
        cell: ({ row: { original } }: Cell) => {
          const basicRoleDisabled = getBasicRoleDisabled(original);
          return (
            basicRoleDisabled && (
              <Box display={'flex'} alignItems={'center'} marginLeft={1}>
                <Tooltip
                  interactive={true}
                  content={
                    <div>
                      This user&apos;s role is not editable because it is synchronized from your auth provider. Refer to
                      the&nbsp;
                      <a
                        href={
                          'https://grafana.com/docs/grafana/latest/administration/user-management/manage-org-users/#change-a-users-organization-permissions'
                        }
                        rel="noreferrer"
                        target="_blank"
                      >
                        Grafana authentication docs
                      </a>
                      &nbsp;for details.
                    </div>
                  }
                >
                  <Icon name="question-circle" />
                </Tooltip>
              </Box>
            )
          );
        },
      },
      {
        id: 'authLabels',
        header: 'Origin',
        cell: ({ cell: { value } }: Cell<'authLabels'>) => (
          <>{Array.isArray(value) && value.length > 0 && <TagBadge label={value[0]} removeIcon={false} count={0} />}</>
        ),
      },
      {
        id: 'isDisabled',
        header: '',
        cell: ({ cell: { value } }: Cell<'isDisabled'>) => <>{value && <Tag colorIndex={9} name={'Disabled'} />}</>,
      },
      {
        id: 'delete',
        header: '',
        cell: ({ row: { original } }: Cell) => {
          return (
            contextSrv.hasPermissionInMetadata(AccessControlAction.OrgUsersRemove, original) && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  setUserToRemove(original);
                }}
                icon="times"
                aria-label={`Delete user ${original.name}`}
              />
            )
          );
        },
      },
    ],
    [rolesLoading, orgId, roleOptions, onRoleChange]
  );

  return (
    <Stack gap={2} data-testid={selectors.container}>
      <InteractiveTable columns={columns} data={users} getRowId={(user) => String(user.userId)} fetchData={fetchData} />
      <Stack justifyContent="flex-end">
        <Pagination onNavigate={changePage} currentPage={page} numberOfPages={totalPages} hideWhenSinglePage={true} />
      </Stack>
      {Boolean(userToRemove) && (
        <ConfirmModal
          body={`Are you sure you want to delete user ${userToRemove?.login}?`}
          confirmText="Delete"
          title="Delete"
          onDismiss={() => {
            setUserToRemove(null);
          }}
          isOpen={true}
          onConfirm={() => {
            if (!userToRemove) {
              return;
            }
            onRemoveUser(userToRemove);
            setUserToRemove(null);
          }}
        />
      )}
    </Stack>
  );
};
