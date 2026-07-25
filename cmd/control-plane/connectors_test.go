package main

import "testing"

func TestConnectorCatalogDefaultsToReadOnlyGrants(t *testing.T) {
	tests := []struct {
		id        string
		writeTool string
	}{
		{"github", "GITHUB_CREATE_OR_UPDATE_FILE_CONTENTS"},
		{"slack", "SLACK_SEND_MESSAGE"},
		{"gmail", "GMAIL_SEND_EMAIL"},
		{"google-drive", "GOOGLEDRIVE_CREATE_FILE"},
		{"notion", "NOTION_CREATE_NOTION_PAGE"},
		{"linear", "LINEAR_CREATE_LINEAR_ISSUE"},
	}
	for _, test := range tests {
		connector, ok := findConnector(test.id)
		if !ok {
			t.Fatalf("%s connector missing", test.id)
		}
		if containsString(connector.Actions, test.writeTool) {
			t.Errorf("%s write tool is granted by default", test.id)
		}
		if !containsString(connector.AvailableActions, test.writeTool) {
			t.Errorf("%s write tool is not available for an explicit grant", test.id)
		}
	}
}
