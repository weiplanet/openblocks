import { Typography } from "antd";
import { GroupRoleInfo, GroupUser, OrgGroup, TacoRoles } from "constants/orgConstants";
import { User } from "constants/userConstants";
import { CustomSelect } from "openblocks-design";
import { AddIcon } from "openblocks-design";
import { EditIcon } from "openblocks-design";
import { PackUpIcon } from "openblocks-design";
import { SuperUserIcon } from "openblocks-design";
import { trans } from "i18n";
import ProfileImage from "pages/common/profileImage";
import React, { useEffect, useMemo } from "react";
import { connect, useDispatch } from "react-redux";
import { AppState } from "redux/reducers";
import {
  deleteGroupUserAction,
  fetchGroupUsersAction,
  quitGroupAction,
  updateGroupAction,
  updateUserGroupRoleAction,
} from "redux/reduxActions/orgActions";
import { getCurrentUser } from "redux/selectors/usersSelectors";
import styled from "styled-components";
import { formatTimestamp } from "util/dateTimeUtils";
import { isGroupAdmin } from "util/permissionUtils";
import AddGroupUserDialog from "./addGroupUserDialog";
import {
  AddMemberButton,
  DevGroupTip,
  GroupNameView,
  LAST_ADMIN_QUIT,
  PermissionHeaderWrapper,
  QuestionTooltip,
  RoleSelectSubTitle,
  RoleSelectTitle,
  StyledTable,
  UserTableCellWrapper,
} from "./styledComponents";

const StyledAddIcon = styled(AddIcon)`
  g path {
    fill: #ffffff;
  }
`;

const StyledEditIcon = styled(EditIcon)`
  :hover g g {
    fill: #315efb;
  }
`;

type GroupPermissionProp = {
  group: OrgGroup;
  orgId: string;
  groupUsers: GroupUser[];
  groupUsersFetching: boolean;
  currentUserGroupRole: string;
  currentUser: User;
};

function GroupUsersPermission(props: GroupPermissionProp) {
  const { Column } = StyledTable;
  const { group, orgId, groupUsersFetching, groupUsers, currentUserGroupRole, currentUser } = props;
  const adminCount = groupUsers.filter((user) => isGroupAdmin(user.role)).length;
  const sortedGroupUsers = useMemo(() => {
    return [...groupUsers].sort((a, b) => {
      if (isGroupAdmin(a.role)) {
        return -1;
      } else if (isGroupAdmin(b.role)) {
        return 1;
      } else {
        return b.joinTime - a.joinTime;
      }
    });
  }, [groupUsers]);
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchGroupUsersAction({ groupId: group.groupId }));
  }, []);
  const groupNameEditable =
    isGroupAdmin(currentUserGroupRole) && !group.devGroup
      ? {
          icon: <StyledEditIcon />,
          maxLength: 30,
          enterIcon: null,
          tooltip: false,
          onChange: (value: string) =>
            dispatch(updateGroupAction({ groupId: group.groupId, groupName: value }, orgId)),
        }
      : false;
  return (
    <>
      <PermissionHeaderWrapper>
        <Typography.Text editable={groupNameEditable}>
          {groupNameEditable ? (
            group.groupName
          ) : (
            <GroupNameView name={group.groupName} toolTip={group.devGroup && DevGroupTip} />
          )}
        </Typography.Text>
        {isGroupAdmin(currentUserGroupRole) && (
          <AddGroupUserDialog
            groupUsers={groupUsers}
            orgId={orgId}
            groupId={group.groupId}
            trigger={
              <AddMemberButton buttonType="primary" icon={<StyledAddIcon />}>
                {trans("memberSettings.addMember")}
              </AddMemberButton>
            }
            style={{ marginLeft: "auto" }}
          />
        )}
      </PermissionHeaderWrapper>
      <StyledTable
        dataSource={sortedGroupUsers}
        rowKey="userId"
        pagination={false}
        loading={groupUsersFetching}
      >
        <Column
          title={trans("memberSettings.nameColumn")}
          dataIndex="userName"
          key="userName"
          ellipsis
          render={(value, record: GroupUser) => (
            <UserTableCellWrapper>
              <ProfileImage source={record.avatarUrl} userName={record.userName} side={40} />
              <span title={record.userName}>{record.userName}</span>
              {isGroupAdmin(record.role) && <SuperUserIcon />}
            </UserTableCellWrapper>
          )}
        />
        <Column
          title={trans("memberSettings.joinTimeColumn")}
          dataIndex="joinTime"
          key="joinTime"
          render={(value) => <span>{formatTimestamp(value)}</span>}
          ellipsis
        />
        <Column
          title={trans("memberSettings.roleColumn")}
          dataIndex="role"
          key="role"
          render={(value, record: GroupUser) => (
            <CustomSelect
              style={{ width: "96px", height: "32px" }}
              dropdownStyle={{ width: "149px" }}
              defaultValue={record.role}
              key={record.role}
              disabled={!isGroupAdmin(currentUserGroupRole) || currentUser.id === record.userId}
              optionLabelProp="label"
              suffixIcon={<PackUpIcon />}
              onChange={(val) => {
                dispatch(
                  updateUserGroupRoleAction({
                    role: val,
                    userId: record.userId,
                    groupId: group.groupId,
                  })
                );
              }}
            >
              {TacoRoles.map((role) => (
                <CustomSelect.Option key={role} value={role} label={GroupRoleInfo[role].name}>
                  <RoleSelectTitle>{GroupRoleInfo[role].name}</RoleSelectTitle>
                  <RoleSelectSubTitle>{GroupRoleInfo[role].desc}</RoleSelectSubTitle>
                </CustomSelect.Option>
              ))}
            </CustomSelect>
          )}
        />
        <Column
          title={trans("memberSettings.actionColumn")}
          key="action"
          render={(value, record: GroupUser) => {
            return (
              <div className="operation-cell-div-wrapper">
                {record.userId === currentUser.id ? (
                  isGroupAdmin(record.role) && adminCount === 1 ? (
                    <QuestionTooltip title={LAST_ADMIN_QUIT} />
                  ) : (
                    <span
                      onClick={() => {
                        dispatch(
                          quitGroupAction({ groupId: group.groupId, userId: currentUser.id })
                        );
                      }}
                    >
                      {trans("memberSettings.exitGroup")}
                    </span>
                  )
                ) : (
                  isGroupAdmin(currentUserGroupRole) && (
                    <span
                      onClick={() => {
                        dispatch(
                          deleteGroupUserAction({
                            userId: record.userId,
                            groupId: group.groupId,
                          })
                        );
                      }}
                    >
                      {trans("memberSettings.moveOutGroup")}
                    </span>
                  )
                )}
              </div>
            );
          }}
        />
      </StyledTable>
    </>
  );
}

const mapStateToProps = (state: AppState) => {
  return {
    groupUsers: state.ui.org.groupUsers,
    groupUsersFetching: state.ui.org.groupUsersFetching,
    currentUser: getCurrentUser(state),
    currentUserGroupRole: state.ui.org.currentUserGroupRole,
  };
};

export default connect(mapStateToProps)(GroupUsersPermission);
