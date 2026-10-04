package runtime

import "encoding/json"

func jsonUnmarshal(data []byte, dst any) error {
	return json.Unmarshal(data, dst)
}

func jsonMarshal(value any) ([]byte, error) {
	return json.Marshal(value)
}
